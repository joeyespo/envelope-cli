import { callSync } from '../utils';
import { ENVELOPE_FILENAME } from '../validation';

export default function develop(config, args, env = process.env) {
  const { develop } = config || {};

  if (!develop) {
    throw new Error(`Missing "develop" field in ${ENVELOPE_FILENAME}`);
  }

  const subenv = {
    ENVELOPE_ENV: 'development'
  };

  // Defer running and proxying to the server when off
  if (develop.proxy === false) {
    const { server } = develop;
    if (!server) {
      throw new Error('The "server" field in "develop" is required when proxy is off');
    }
    // TODO: exec/execFile on non-Windows systems
    // https://nodejs.org/api/child_process.html#child_process_spawning_bat_and_cmd_files_on_windows
    const command = [server, ...args].join(' ');
    console.log('server:', command);
    return callSync(command, { ...env, ...subenv });
  }

  // TODO: Implement develop proxy
  throw new Error('The develop-mode proxy is not yet implemented -- please set `proxy: false` in `develop` in the meantime');
}
