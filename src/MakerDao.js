const State = {
  CREATED: 'CREATED',
  INITIALIZING: 'INITIALIZING',
  OFFLINE: 'OFFLINE',
  CONNECTING: 'CONNECTING',
  ONLINE: 'ONLINE'
};

const stateTransitions = {
  CREATED: [State.INITIALIZING],
  INITIALIZING: [State.CONNECTING, State.OFFLINE],
  CONNECTING: [State.OFFLINE, State.ONLINE],
  OFFLINE: [State.CONNECTING],
  ONLINE: [State.OFFLINE]
};

class IllegalStateError extends Error {}

class MakerDao {

  constructor() {
    this._state = State.CREATED;
    this._stateChangedHandlers = [];
  }

  initialize(connect = true) {
    this._assertState(State.CREATED, 'initialize');

    this._setState(State.INITIALIZING);
    this._setState(State.OFFLINE);

    if (connect) {
      this.connect();
    }
  }

  connect() {
    this._assertState([State.OFFLINE, State.CONNECTING, State.ONLINE], 'connect');

    if (this.inState(State.OFFLINE)) {
      this._setState(State.CONNECTING);
    }

    if (this.inState(State.CONNECTING)) {
      this._setState(State.ONLINE);
    }
  }

  onStateChanged(callback) {
    this._stateChangedHandlers.push(callback);
  }

  state() {
    return this._state;
  }

  inState(state) {
    if (!(state instanceof Array)) {
      state = [state];
    }

    return state.indexOf(this._state) >= 0;
  }

  _assertState(state, operation = '') {
    if (!this.inState(state)) {
      throw new IllegalStateError('Illegal operation for state ' + this._state + (operation.length > 0 ? ': ' + operation : ''));
    }
  }

  _setState(newState) {
    if (State[newState] === undefined) {
      throw new IllegalStateError('Cannot set illegal state: ' + newState);
    }

    if (newState !== this._state) {
      if (stateTransitions[this._state].indexOf(newState) < 0) {
        throw new IllegalStateError('Illegal state transition: ' + this._state + ' to ' + newState);
      }

      const oldState = this._state;
      this._state = newState;
      this._stateChangedHandlers.forEach((cb) => cb(oldState, newState));
    }
  }
}

export {
  MakerDao as default,
  State,
  IllegalStateError
};