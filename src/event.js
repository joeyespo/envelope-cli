// Allows waiting on a one-time event using promises to handle late-joining listeners
export class OneTimeEvent {
  constructor() {
    this._signal = false;
    this._promise = new Promise(resolve => {
      this._resolve = resolve;
    });
  }

  signal() {
    if (!this._signal) {
      this._signal = true;
      this._resolve();
    }
  }

  then(onFulfilled) {
    return this._promise.then(onFulfilled);
  }
}
