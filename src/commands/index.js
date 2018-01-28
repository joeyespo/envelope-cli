import { docopt } from 'docopt';
import { version } from '../../package.json';
import build from './build';
import develop from './develop';
import release from './release';
import start from './start';

// TODO: .envelope.yml file for local non-git-committed config overrides (like --color and --mux)

export const USAGE = `
Usage: envelope [options] <command> [<args>...]

Options:
  -h, --help      Show usage information
  -v, --version   Show version number

Commands:
  s, start           Runs either 'develop' or 'release' depending on NODE_ENV
  d, develop         Runs the client and server commands and exposes them behind a reverse proxy
  r, release         Builds the client, runs the serve command, and exposs them behind a production server
  b, build           Builds the client (without running any servers)

Run \`envelope help COMMAND\` for more information on a specific command.
`.trim();

export const COMMANDS = { start, develop, release, build };
export const ALIASES = { s: 'start', d: 'develop', r: 'release', b: 'build' };

function help(command) {
  if (!command) {
    console.log(USAGE);
    return 0;
  } else if (command === 'help') {
    console.log('Usage: envelope help <command>\n\n  Show extended help about a command.');
    return 0;
  } else if (Object.keys(COMMANDS).includes(command)) {
    return COMMANDS[command](['--help']);
  } else {
    throw new Error(`Command "${command}" not found`);
  }
}

function cli(argv = process.argv, env = process.env) {
  const { '<command>': rawCommand, '<args>': args } = docopt(USAGE, { argv: argv.slice(2), version });
  const command = ALIASES[rawCommand] || rawCommand;

  // Show command help
  if (command === 'help') {
    return help(args[0]);
  }

  // Validate command
  if (!Object.keys(COMMANDS).includes(command)) {
    throw new Error(`Command "${command}" not found`);
  }

  // TODO: Load .env file

  // Run command
  console.log(`envelope ${command} v${version}`);
  return COMMANDS[command](args, env);
}

export function main(argv = process.argv, env = process.env) {
  // Show full usage by default
  if (argv.length <= 2) {
    console.log(USAGE);
    return 0;
  }

  try {
    return cli(argv, env);
  } catch (ex) {
    console.error(env.DEBUG_ENVELOPE ? ex : String(ex));
    return 1;
  }
}
