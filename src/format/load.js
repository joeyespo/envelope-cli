import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';
import { ENVELOPE_FILENAME } from './constants';
import normalize from './normalize';

export function loadConfigRaw(path = ENVELOPE_FILENAME) {
  try {
    return safeLoad(readFileSync(path, 'utf8')) || {};
  } catch (ex) {
    if (ex.code !== 'ENOENT') {
      throw ex;
    }
    throw new Error(`No ${path} file found`);
  }
}

export default function loadConfig(path = ENVELOPE_FILENAME) {
  return normalize(loadConfigRaw(path));
}
