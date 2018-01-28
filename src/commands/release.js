import { docopt } from 'docopt';
import { version } from '../../package.json';
import { callSync } from '../process';
import { ENVELOPE_FILENAME, loadConfig } from '../format';

// TODO: Add more documentation to USAGE

export const USAGE = `
Usage: envelope release

  Builds the client, runs the serve command, and exposs them behind a production server.
`.trim();

export default function release(argv = process.argv, env = process.env) {
  docopt(USAGE, { argv: ['release', ...argv], version });

  const { release } = loadConfig();
  if (!release) {
    throw new Error(`Missing "release" field in ${ENVELOPE_FILENAME}`);
  }

  // Extend the environment
  const childEnv = { ...env, ENVELOPE_ENV: 'production' };

  // Defer running and proxying to the server when off
  if (release.proxy === false) {
    const { serve } = release;
    if (!serve) {
      throw new Error('The "serve" field in "release" is required when proxy is off');
    }
    // TODO: exec/execFile on non-Windows systems
    // https://nodejs.org/api/child_process.html#child_process_spawning_bat_and_cmd_files_on_windows
    const command = [serve, ...argv].join(' ');
    return callSync(command, { name: 'serve', env: childEnv });
  }

  // TODO: Implement release proxy
  throw new Error('The release-mode proxy is not yet implemented -- please set `proxy: false` in `release` in the meantime');
}
