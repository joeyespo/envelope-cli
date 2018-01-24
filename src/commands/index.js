import build from './build';
import develop from './develop';
import release from './release';
import start from './start';
import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';
import { version } from '../../package.json';
import { ENVELOPE_FILENAME, normalize } from '../validation';

export const COMMANDS = { start, develop, release, build };
export const USAGE = [
  'Usage: envelope [command] [options]',
  '',
  'Commands:',
  `  ${Object.keys(COMMANDS).join('\n  ')}`,
].join('\n');

function showUsage(config, args, env = process.env) {
  console.log();
  console.log(USAGE);
}

function run(command, config, args, env = process.env) {
  if (!COMMANDS[command]) {
    throw new Error(`Command "${command}" not found`);
  }
  return COMMANDS[command](config, args, env);
}

export function main(argv = process.argv, env = process.env) {
  console.log(`envelope: ${version}`);

  // Load envelope config
  let doc;
  try {
    doc = safeLoad(readFileSync(ENVELOPE_FILENAME, 'utf8'));
  } catch (ex) {
    if (ex.code !== 'ENOENT') {
      throw ex;
    }
    console.log(`No ${ENVELOPE_FILENAME} found`);
    return 0;
  }

  // Normalize and validate config
  const config = normalize(doc || {});

  // TODO: Load .env file

  // Show usage
  if (argv.length <3) {
    showUsage();
    return 0;
  }

  // Run command
  const [command, ...args] = argv.length > 2 ? argv.slice(2) : [];
  try{
    return run(command, config, args, env);
  } catch (ex) {
    console.error(env.DEBUG_ENVELOPE ? ex : String(ex));
    return 1;
  }
}
