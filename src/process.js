import { createInterface } from 'readline';
import { spawnSync } from 'child_process';
import { MutedWritable, PrefixedWritable } from './stream';
import execa from 'execa';
import terminate from 'terminate';

export function onInterrupt(cb) {
  // Special handling for graceful exit on Windows
  const listener = process.platform === 'win32'
    ? createInterface({ input: process.stdin, output: new MutedWritable() })
    : process;
  listener.on('SIGINT', () => cb('SIGINT'));
}

export function call(argv, { name = null, env = process.env, emitter = null, interactive = false }) {
  if (name) {
    console.log(`${name}: ${argv.join(' ')}`);
  }

  const [command, ...args] = argv;
  const stdio = interactive ? ['inherit', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'];
  const p = execa(command, args, { env, extendEnv: false, reject: false, stdio });

  const lineState = {};
  p.stdout.pipe(new PrefixedWritable(name, process.stdout, lineState));
  p.stderr.pipe(new PrefixedWritable(name, process.stderr, lineState));

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
