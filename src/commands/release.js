import { callSync } from '../utils';
import { ENVELOPE_FILENAME } from '../format';

export default function release(config, args, env = process.env) {
  const { release } = config;

  if (!release) {
    throw new Error(`Missing "release" field in ${ENVELOPE_FILENAME}`);
  }

  const subenv = {
    ENVELOPE_ENV: 'production'
  };

  // Defer running and proxying to the server when off
  if (release.proxy === false) {
    const { serve } = release;
    if (!serve) {
      throw new Error('The "serve" field in "release" is required when proxy is off');
    }
    // TODO: exec/execFile on non-Windows systems
    // https://nodejs.org/api/child_process.html#child_process_spawning_bat_and_cmd_files_on_windows
    const command = [serve, ...args].join(' ');
    console.log('serve:', command);
    return callSync(command, { ...env, ...subenv });
  }

  // TODO: Implement release proxy
  throw new Error('The release-mode proxy is not yet implemented -- please set `proxy: false` in `release` in the meantime');
}
