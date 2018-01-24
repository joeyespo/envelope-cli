import { spawnSync } from 'child_process';

export function callSync(command, env = process.env) {
  return spawnSync(command, { stdio: 'inherit', env, shell: true }).status;
}
