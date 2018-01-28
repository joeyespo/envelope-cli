import { createInterface } from 'readline';
import { Writable } from 'stream';
import { spawnSync } from 'child_process';
import execa from 'execa';
import terminate from 'terminate';

class PrefixedWritable extends Writable {
  constructor(prefix, innerStream, lineState, ...args) {
    super(...args)
    this.prefix = prefix;
    this.innerStream = innerStream || process.stdout;
    this.lineState = lineState || {};
    this.lineState.beginWithNewline = this.lineState.beginWithNewline || false;
  }

  write(chunk, encoding, callback) {
    const prefix = `${this.prefix}  | `;
    const lines = chunk.toString().replace('\r\n', '\n').split('\n');
    const last = lines[lines.length - 1] === '' ? lines.pop() : [];
    const prefixed = lines.map(s => [prefix, s].join('')).concat(last);

    // Force newline
    if (this.lineState.beginWithNewline) {
      prefixed.unshift('');
    }

    // Write prefixed lines
    const output = prefixed.join('\n');
    this.innerStream.write(output, encoding);

    // Track whether output ended with a newline
    this.lineState.beginWithNewline = output[output.length - 1] !== '\n';

    if (callback) {
      callback();
    }
  }
}

class MutedWritable extends Writable {
  constructor(innerStream, ...args) {
    super(...args);
    this.innerStream = innerStream || process.stdout;
    this.isTTY = this.innerStream.isTTY;
    this.muted = true;
  }

  write(chunk, encoding, callback) {
    if (!this.muted) {
      this.innerStream.write(chunk, encoding, callback);
    } else if (callback) {
      callback();
    }
  }
}

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
