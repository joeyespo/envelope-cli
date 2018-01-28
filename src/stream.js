import { Writable } from 'stream';

export class PrefixedWritable extends Writable {
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

export class MutedWritable extends Writable {
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
