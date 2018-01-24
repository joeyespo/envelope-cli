import { coerce, satisfies } from 'semver';
import { ENVELOPE_FILENAME, SUPPORTED_VERSIONS } from './constants';

export default function normalize(config) {
  const { version, develop, release, ports } = config;

  // Check version
  if (!version) {
    throw new Error('Missing required "version" field');
  }
  if (!satisfies(coerce(config.version), SUPPORTED_VERSIONS)) {
    throw new Error(`Unsupported ${ENVELOPE_FILENAME} version (${config.version}) -- please upgrade envelope and try again`);
  }

  // Normalize the config
  const normalized = {
    version,
    develop,  // TODO: Allow implicit "develop: x" field?
    release,  // TODO: Allow implicit "release: x" field?
    ports     // TODO: Allow implicit "ports: x" field?
  }

  // Validate fields
  const normalizedKeys = Object.keys(normalized);
  for (const key of Object.keys(config)) {
    if (!normalizedKeys.includes(key)) {
      throw new Error(`Unknown ${ENVELOPE_FILENAME} field "${key}"`);
    }
    // TODO: Validate individual fields
  }

  return normalized;
}
