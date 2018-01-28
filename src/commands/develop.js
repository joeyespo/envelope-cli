import { docopt } from 'docopt';
import { EventEmitter } from 'events';
import { version } from '../../package.json';
import { call, callSync, onInterrupt } from '../utils';
import { ENVELOPE_FILENAME, loadConfig } from '../format';

// TODO: Add more documentation to USAGE
// TODO: -c, --config for specifying a different envelope.yml file
// TODO: --color=<mode> to add or remove color (auto, always, none)
// TODO: --mux=<mode> to change the multiplex mode (inherit, pipe, detached, server, client, none (still shows stderr?), silent)

export const USAGE = `
Usage: envelope [options] develop [<subcommand>] [<args>...]

  Runs the client and server commands and exposes them behind a reverse proxy.

Options:
  -i <subcommand>   Runs the specified subcommand with stdin
                    On by default if <subcommand> is specified (set to 'none' to disable)

Subcommands:
  server            Runs the server withouth the client or proxy
  client            Runs the client withouth the server or proxy
  proxy             Runs the proxy without the client or server
`.trim();

const SUBCOMMANDS = ['server', 'client', 'proxy'];

export default function develop(argv = process.argv, env = process.env) {
  const {
    '<subcommand>': subcommand,
    '<args>': args,
    '-i': rawInteractive
  } = docopt(USAGE, { argv: ['develop', ...argv], version });
  const interactive = rawInteractive || subcommand;

  // Validation
  if (subcommand && !SUBCOMMANDS.includes(subcommand)) {
    // TODO: Better error?
    throw new Error(`Subcommand "${subcommand}" not found`);
  }
  if (interactive && !['server', 'client', 'none', 'both'].includes(interactive)) {
    // TODO: Better error?
    throw new Error(`Interactive subcommand "${interactive}" not found`);
  }

  const { develop } = loadConfig();
  if (!develop) {
    throw new Error(`Missing "develop" field in ${ENVELOPE_FILENAME}`);
  }

  // Extend the environment
  const childEnv = { ...env, ENVELOPE_ENV: 'development' };

  // Defer running and proxying to the server when off
  if (develop.proxy === false) {
    const { server } = develop;
    if (!server) {
      throw new Error('The "server" field in "develop" is required when proxy is off');
    }
    return callSync([server, ...args].join(' '), { name: 'server', env: childEnv });
  }

  // Events
  const emitter = new EventEmitter();
  emitter.once('shutdown', signal => console.log(`Shutting down...`));
  emitter.on('keyboard-interrupt', signal => emitter.emit('shutdown', signal));
  if (!interactive || interactive === 'none') {
    onInterrupt(signal => emitter.emit('keyboard-interrupt', signal));
  }

  const { client, server } = develop;
  const processes = [];

  // Run processes
  if (server && (!subcommand || subcommand === 'server')) {
    processes.push(call([...server.split(' '), ...args], {
      name: 'server',
      env: childEnv,
      emitter,
      interactive: interactive === 'server' || interactive === 'both'
    }));
  }
  if (client && (!subcommand || subcommand === 'client')) {
    processes.push(call([...client.split(' '), ...args], {
      name: 'client',
      env: childEnv,
      emitter,
      interactive: interactive === 'client' || interactive === 'both'
    }));
  }

  // TODO: error if 'start server' and no server, etc
  // TODO: error if '--i server' and no server, etc
  // TODO: error if no server, client, or proxy?
  // TODO: error if server or client are missing? (require empty to explicitly opt out)
  // TODO: wait on server to start before starting client? (option to change this order?)
  //       -> to prevent multiplexing issues -- worth it?
  //       -> or hide the output until server starts? -- will this work?

  // TODO: Start reverse proxy

  // TODO: Wait on clientProcess exit? Return promise?

  // Exit cleanly after all subprocess exit
  return Promise.all(processes).then(() => {
    process.exit(0);
  });
}
