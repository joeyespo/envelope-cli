import { createInterface } from 'readline';
import { spawnSync } from 'child_process';
import execa from 'execa';
import terminate from 'terminate';

// TODO: Don't use this after all
export function onInterrupt(cb) {
  // Special handling for graceful exit on Windows
  const listener = process.platform === 'win32'
    ? createInterface({ input: process.stdin, output: process.stdout })
    : process;
  listener.on('SIGINT', () => cb('SIGINT'));
}

export function call(argv, { name = null, env = process.env, emitter = null }) {
  if (name) {
    console.log(`${name}: ${argv.join(' ')}`);
  }

  const [command, ...args] = argv;
  const p = execa(command, args, { env, extendEnv: false, reject: false, stdio: ['ignore', 'inherit', 'inherit'] });

  if (emitter) {
    let shutdownHandled = false;
    p.once('exit', (code, signal) => {
      if (shutdownHandled) {
        return;
      }
      if (name && code !== null) {
        console.log(`${name} ${code === 0 ? 'exited' : 'failed'} with code ${code}`);
      }
      emitter.emit('shutdown', signal);
    });
    emitter.on('shutdown', () => {
      shutdownHandled = true;
      terminate(p.pid);
    });
  }

  return p;
}

export function callSync(command, { name = null, env = process.env }) {
  if (name) {
    console.log(`${name}: ${command}`);
  }
  return spawnSync(command, { stdio: 'inherit', env, shell: true }).status;
}
