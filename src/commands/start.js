import { docopt } from 'docopt';
import { version } from '../../package.json';
import develop from './develop';
import release from './release';

export const USAGE = `
Usage: envelope [options] start [<args>...]

  Runs either 'develop' or 'release' depending on NODE_ENV.

  If NODE_ENV is "production", 'release' is run. Otherwise, "development" is
  assumed to be the environment and 'develop' is run.

  All argumuents will be forwarded to the respective command.
`.trim();

export default function start(argv = process.argv.slice(2), env = process.env) {
  docopt(USAGE, { argv: ['start', ...argv], version });

  return env.NODE_ENV === 'production' ?  // TODO: Other ways to enter production mode?
    release(...arguments) :
    develop(...arguments);
}
