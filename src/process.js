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

export function call(argv, { name = null, env = process.env, shutdownEvent = null, interactive = false }) {
  if (name) {
    console.log(`${name}: ${argv.join(' ')}`);
  }

  const [command, ...args] = argv;
  const stdio = interactive ? ['inherit', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'];
  const p = execa(command, args, { env, extendEnv: false, reject: false, stdio });

  const lineState = {};
  p.stdout.pipe(new PrefixedWritable(name, process.stdout, lineState));
  p.stderr.pipe(new PrefixedWritable(name, process.stderr, lineState));

  let shutdownReceived = false;
  let exited = false;
  p.then(({ code, signal }) => {
    exited = true;
    if (!shutdownReceived) {
      if (name && code !== null) {
        console.log(`${name} ${code === 0 ? 'exited' : 'failed'} with code ${code}`);
      }
      if (shutdownEvent) {
        shutdownEvent.signal();
      }
    }
  });
  if (shutdownEvent) {
    shutdownEvent.then(() => {
      shutdownReceived = true;
      function waitAndTerminate(pid) {
        terminate(pid, err => {
          // Parent process and its subprocesses exited
          if (exited) {
            return;
          }
          // Wait and try again if process or one of its child processes hasn't finished starting yet
          if (!err || err.errno === 'ESRCH') {
            setTimeout(() => waitAndTerminate(pid), 200);
            return;
          }
          // Show error if unfinished parent process could not be found
          const message = env.DEBUG_ENVELOPE ? err : String(err);
          console.error(`Could not terminate '${name}' (PID ${pid}): ${message}`)
          process.exit(1);
        });
      }
      waitAndTerminate(p.pid);
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
