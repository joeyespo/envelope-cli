import { docopt } from 'docopt';
import { version } from '../../package.json';
import build from './build';
import develop from './develop';
import release from './release';
import start from './start';

export const USAGE = `
Usage: envelope <command> [<args>...]

Options:
  -h, --help      Show usage information
  -v, --version   Show version number

Commands:
  start           Runs either 'develop' or 'release' depending on NODE_ENV
  develop         Runs the client and server commands and exposes them behind a reverse proxy
  release         Builds the client, runs the serve command, and exposs them behind a production server
  build           Builds the client (without running any servers)

Run \`envelope help COMMAND\` for more information on a specific command.
`.trim();

export const COMMANDS = { start, develop, release, build };

function cli(argv = process.argv, env = process.env) {
  const { '<command>': command, '<args>': args } = docopt(USAGE, { argv: argv.slice(2), version });

  // Show command help
  if (command === 'help') {
    const topic = args[0];
    if (Object.keys(COMMANDS).includes(topic)) {
      return COMMANDS[topic]([...args.slice(1), '--help']);
    }
    console.log(USAGE);
    return 0;
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
