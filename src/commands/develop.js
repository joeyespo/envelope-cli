import { docopt } from 'docopt';
import { EventEmitter } from 'events';
import { createProxyServer } from 'http-proxy';
import { createServer } from 'http';
import { version } from '../../package.json';
import { OneTimeEvent } from '../event';
import { ENVELOPE_FILENAME, loadConfig } from '../format';
import { call, callSync, onInterrupt } from '../process';
import { PrefixedWritable } from '../stream';
import connect from 'connect';

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
  --host <hostname> Runs the proxy on the specified host
  -p, --port <int>  Runs the proxy on the specified port

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
    '-i': rawInteractive,
    '--host': host,
    '--port': port,
  } = docopt(USAGE, { argv: ['develop', ...argv], version });
  const interactive = rawInteractive || (subcommand !== 'proxy' ? subcommand : null);

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
  const shutdownEvent = new OneTimeEvent();
  shutdownEvent.then(() => console.log(`Shutting down...`));
  const emitter = new EventEmitter();
  emitter.once('shutdown', () => shutdownEvent.signal());
  emitter.on('keyboard-interrupt', signal => emitter.emit('shutdown', signal));
  if (!interactive || interactive === 'none') {
    onInterrupt(signal => emitter.emit('keyboard-interrupt', signal));
  }

  // TODO: Separate concerns?
  const output = new PrefixedWritable('', process.stdout);
  const address = [
    host || env.ENVELOPE_HOST || env.HOST || 'localhost',   // TODO: Get from local config
    port || env.ENVELOPE_PORT || env.PORT || 8000,          // TODO: Get from local config
  ];

  // TODO: Use --port when using subcommand?
  const basePort = address[1] > 1024 ? address[1] : 8000;
  const serverPort = basePort + 1;  // TODO: Get from local config (and from envelope.yml too?)
  const clientPort = basePort + 2;  // TODO: Get from local config (and from envelope.yml too?)

  // Run reverse proxy
  if (!subcommand || subcommand === 'proxy') {
    // TODO: Chalk around this address to make it stand out
    // TODO: Rename 'proxy' to 'router' everywhere?
    console.log(`router: Running on http://${address.join(':')}/ (Press CTRL+C to quit)`);
    const app = connect();
    const proxy = createProxyServer();
    // TODO: Allow overriding clientPort when subcommand is 'proxy'?
    const proxyOutput = new PrefixedWritable('proxy ', output);
    const serverTarget = `http://localhost:${serverPort}`;
    const clientTarget = `http://localhost:${clientPort}`;
    // TODO: Customize server route through envelope.yml? Or .env? Or require /api?
    // TODO: Log visits like [router] -- or allow envelope.yml or local config to silence (if redundant, e.g. DEBUG mode)
    // TODO: /__/ routes
    // Route /api to server
    app.use('/api', (req, res, next) => {
      proxy.web(req, res, { target: serverTarget }, err => {
        // TODO: Wait on client and try again (if not proxy-only)
        proxyOutput.write(`${err}\n`);
        // TODO: Better error message
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(String(err));
      });
      proxy.on('upgrade', (req, socket, head) => proxy.ws(req, socket, head));
    });
    // Route all other requests to the client
    app.use((req, res) => {
      proxy.web(req, res, { target: clientTarget }, err => {
        // TODO: Wait on client and try again (if not proxy-only)
        proxyOutput.write(`${err}\n`);
        // TODO: Better error message
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(String(err));
      });
      proxy.on('upgrade', (req, socket, head) => proxy.ws(req, socket, head));
    });
    // Run proxy server
    createServer(app).listen(address[1], address[0]);
  }

  // Run processes
  const { client, server } = develop;
  const promises = [shutdownEvent];
  if (server && (!subcommand || subcommand === 'server')) {
    promises.push(call([...server.split(' '), ...args], {
      name: 'server',
      env: { ...childEnv, HOST: 'localhost', PORT: serverPort },  // TODO: Allow overriding using ENV?
      output,
      shutdownEvent,
      interactive: interactive === 'server' || interactive === 'both'
    }));
  }
  if (client && (!subcommand || subcommand === 'client')) {
    promises.push(call([...client.split(' '), ...args], {
      name: 'client',
      env: { ...childEnv, HOST: 'localhost', PORT: clientPort },  // TODO: Allow overriding using ENV?
      output,
      shutdownEvent,
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
  return Promise.all(promises).then(() => {
    process.exit(0);
  });
}
