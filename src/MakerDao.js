import StateMachine from './StateMachine';

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
    this._stateMachine = new StateMachine(State.CREATED, stateTransitions);
  }

  initialize(connect = true) {
    this._stateMachine.assertState(State.CREATED, 'initialize');

    this._stateMachine.transitionTo(State.INITIALIZING);
    this._stateMachine.transitionTo(State.OFFLINE);

    if (connect) {
      this.connect();
    }
  }

  connect() {
    this._stateMachine.assertState([State.OFFLINE, State.CONNECTING, State.ONLINE], 'connect');

    if (this._stateMachine.inState(State.OFFLINE)) {
      this._stateMachine.transitionTo(State.CONNECTING);
    }

    if (this._stateMachine.inState(State.CONNECTING)) {
      this._stateMachine.transitionTo(State.ONLINE);
    }
  }

  onStateChanged(callback) {
    this._stateMachine.onStateChanged(callback);
  }

  state() {
    return this._stateMachine.state();
  }

  inState(state) {
    return this._stateMachine.inState(state);
  }
}

export {
  MakerDao as default,
  State,
  IllegalStateError
};