import { createInterface } from 'readline';
import { spawn, spawnSync } from 'child_process';

// TODO: Extract
function write(f, name, message) {
  const lines = message
    .replace('\r', '')
    // .replace(/\u001b\[[0-9]+[A-G]/, '')  // TODO: Keep? Enable color without tty? -- is this project-specific?
    // .replace(/\u001b\[(2J)|K|s|u/, '')
    .split('\n')
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }
  for (const line of lines) {
    f(`${name}  | ${line}`);
  }
}

function log(name, message) {
  return write(console.log, name, message);
}

function error(name, message) {
  return write(console.error, name, message);
}

export function onInterrupt(cb) {
  // Special handling for graceful exit on Windows
  const listener = process.platform === 'win32'
    ? createInterface({ input: process.stdin, output: process.stdout })
    : process;
  listener.on('SIGINT', () => cb('SIGINT'));
}

export function call(command, { name = null, env = process.env, emitter = null, multiplex = 'raw' }) {
  if (name) {
    console.log(`${name}: ${command}`);
  }

  const stdio = {
    raw: ['ignore', 'inherit', 'inherit'],
    pipe: ['ignore', 'pipe', 'pipe'],
    none: ['ignore', 'ignore', 'ignore']
  }[multiplex];
  // TODO: `detached`?

  const p = spawn(command, { env, stdio, shell: true, detached: true });

  if (multiplex === 'pipe') {
    p.stdout.on('data', data => log(name, data.toString()));
    p.stderr.on('data', data => error(name, data.toString()));
  }
  p.on('error', err => error(name, err));

  const promise = new Promise((resolve, reject) => {
    p.once('exit', (code, signal) => {
      if (emitter) {
        if (name && code !== null) {
          log(name, `${code === 0 ? 'exited' : 'failed'} with code ${code}, shutting down...`);
        }
        emitter.emit('shutdown', signal);
      }
    });
    p.once('close', (code, signal) => {
      resolve({ code, signal });
    });
  });

  if (emitter) {
    emitter.on('shutdown', signal => {
      // TODO: How to kill shell's child process?
      log(name, `Received shutdown signal ${signal}`);
      p.kill(signal || 'SIGTERM')
    });
  }

  return promise;
}

export function callSync(command, { name = null, env = process.env }) {
  if (name) {
    console.log(`${name}: ${command}`);
  }
  return spawnSync(command, { stdio: 'inherit', env, shell: true }).status;
}
