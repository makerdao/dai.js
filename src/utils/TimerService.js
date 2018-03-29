import LocalService from '../core/LocalService';

export default class TimerService extends LocalService {
  constructor(name = 'timer') {
    super(name);
    this._timers = {};
  }

  createTimer(name, duration, repeating, callback) {
    this.disposeTimer(name);
    this._timers[name] = {
      repeating,
      id: (repeating ? setInterval : setTimeout)(callback, duration)
    };
  }

  disposeTimer(name) {
    if (this._timers.hasOwnProperty(name)) {
      let timer = this._timers[name];
      (timer.repeating ? clearInterval : clearTimeout)(timer.id);
    }
  }

  disposeAllTimers() {
    for (let name of this.listTimers()) {
      this.disposeTimer(name);
    }
  }

  listTimers() {
    return Object.keys(this._timers);
  }
}
