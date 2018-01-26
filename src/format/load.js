import { readFileSync } from 'fs';
import { YAMLException, safeLoad } from 'js-yaml';
import { ENVELOPE_FILENAME } from './constants';
import normalize from './normalize';

export function loadConfigRaw(path = ENVELOPE_FILENAME, env = process.env) {
  try {
    return safeLoad(readFileSync(path, 'utf8')) || {};
  } catch (ex) {
    if (!env.DEBUG_ENVELOPE) {
      if (ex instanceof YAMLException) {
        throw new Error(`Could not load ${ENVELOPE_FILENAME}: ${ex.message}`);
      } else if (ex.code === 'ENOENT') {
        throw new Error(`No ${path} file found`);
      }
    }

    throw ex;
  }
}

export default function loadConfig(path = ENVELOPE_FILENAME, env = process.env) {
  return normalize(loadConfigRaw(path));
}
