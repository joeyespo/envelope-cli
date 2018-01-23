import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { safeLoad } from 'js-yaml';
import { coerce, satisfies } from 'semver';
import { version } from '../package.json';

export const ENVELOPE_FILE = 'envelope.yml';
export const SUPPORTED_VERSIONS = '0.x';

function normalize(config) {
  const { version, runner, develop, release, ports } = config;

  // Check version
  if (!version) {
    throw new Error('Missing required "version" field');
  }
  if (!satisfies(coerce(config.version), SUPPORTED_VERSIONS)) {
    throw new Error(`Unsupported ${ENVELOPE_FILE} version (${config.version}) -- please upgrade envelope and try again`);
  }

  const normalized = {
    version,
    // TODO: Keep "runner"?
    // TODO: Allow implied "client" and "build" if "runner" is removed?
    runner: typeof runner === 'string' ? { command: runner } : runner,
    develop: typeof develop === 'string' ? { client: develop } : develop,
    release: typeof release === 'string' ? { build: release } : release,
    ports   // TODO: Allow implicit "ports: x" field?
  }

  // Error on unsupported field
  const normalizedKeys = Object.keys(normalized);
  for (const key of Object.keys(config)) {
    // TODO: Validate individual fields
    if (!normalizedKeys.includes(key)) {
      throw new Error(`Unknown ${ENVELOPE_FILE} field "${key}"`);
    }
  }

  return normalized;
}

export function main() {
  console.log(`envelope: ${version}`);

  try {
    const envelopeFile = resolve(ENVELOPE_FILE);
    const config = normalize(safeLoad(readFileSync(envelopeFile, 'utf8')) || {});

    // TODO: Load .env file

    // TODO: Keep the runner?
    // Check for runner
    if (config.runner) {
      const runner = typeof config.runner === 'string' ? config.runner : config.runner.command;
      if (!runner) {
        throw new Error('Runner specified without a command');
      }
      // TODO: exec/execFile on non-Windows systems
      // https://nodejs.org/api/child_process.html#child_process_spawning_bat_and_cmd_files_on_windows
      const command = [runner].concat(process.argv.slice(2)).join(' ');
      console.log('runner:', command);
      return spawnSync(command, { shell: true, stdio: 'inherit' }).status;
    }

    // TODO: implement
    throw new Error('Using envelope without a runner is not yet implemented -- please set the "runner" field in the meantime or upgrade to a newer version');
  } catch (ex) {
    if (ex.code === 'ENOENT') {
      console.log(`No ${ENVELOPE_FILE} found`);
      return 0;
    }
    console.log(`Error: ${ex}`);
    return 1;
  }
}
