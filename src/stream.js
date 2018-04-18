import { Writable } from 'stream';

export class PrefixedWritable extends Writable {
  constructor(prefix, innerStream, lineState, ...args) {
    super(...args)
    this.prefix = prefix;
    this.innerStream = innerStream || process.stdout;
    this.isTTY = this.innerStream.isTTY;
    this.lineState = lineState || {};
    this.lineState.beginWithNewline = this.lineState.beginWithNewline || false;
  }

  render(line) {
    let result = line;

    // Render backspaces
    if (line.includes('\x08')) {
      let index = 0;
      result = '';
      for (const ch of line) {
        if (ch === '\x08') {
          if (index > 0) {
            index -= 1;
          }
          continue;
        }
        result = index < result.length
          ? result.substr(0, index) + ch + result.substr(index + 1)
          : result + ch;
        index += 1;
      }
    }

    return result;
  }

  write(chunk, encoding, callback) {
    const prefix = this.prefix ? `${this.prefix}  | ` : '';
    const lines = chunk.toString().replace('\r\n', '\n').split('\n');
    const rendered = [];

    // Look for terminal commands
    let tty = false;
    for (const line of lines) {
      const result = this.render(line);
      tty = tty || line !== result;
      if (!tty || result.trim()) {
        rendered.push(result);
      }
    }
    const last = rendered[rendered.length - 1] === '' ? rendered.pop() : [];

    // Force newline
    if (this.lineState.beginWithNewline) {
      rendered.unshift('');
    }

    // Add prefix to each line
    const prefixed = rendered.map(s => [prefix, s].join('')).concat(last);

    // Collect and write prefixed lines
    const output = prefixed.join('\n');
    if (output) {
      this.innerStream.write(output, encoding);
    }

    // Track whether output ended with a newline
    this.lineState.beginWithNewline = output[output.length - 1] !== '\n' && !tty;

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

export class StrippedWritable extends Writable {
  constructor(innerStream, ...args) {
    super(...args)
    this.innerStream = innerStream || process.stdout;
    this.isTTY = this.innerStream.isTTY;
  }

  write(chunk, encoding, callback) {
    let output = chunk.toString();

    // while (output.includes('\x08\x08')) {
    //   output = output.replace(/\x08\x08/g, '\x08');
    // }
    // output = output.replace(/\x08/g, '.')

     this.innerStream.write(output, encoding);

    if (callback) {
      callback();
    }
  }
}
