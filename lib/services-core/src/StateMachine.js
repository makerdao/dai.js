export class IllegalStateError extends Error {}

export default class StateMachine {
  constructor(initialState, transitions) {
    if (typeof transitions !== 'object') {
      throw new Error('StateMachine transitions parameter must be an object.');
    }

    if (
      Object.keys(transitions).filter(
        k => transitions.hasOwnProperty(k) && !(transitions[k] instanceof Array)
      ).length > 0
    ) {
      throw new Error('Illegal StateMachine transition found: not an array.');
    }

    if (
      Object.keys(transitions).filter(
        k =>
          transitions.hasOwnProperty(k) &&
          transitions[k].filter(s => !transitions[s]).length > 0
      ).length > 0
    ) {
      throw new Error(
        'Illegal StateMachine transition found: target state not in transition map.'
      );
    }

    if (!(transitions[initialState] instanceof Array)) {
      throw new Error(
        'Initial state ' + initialState + ' is not set in the transitions map.'
      );
    }

    this._state = initialState;
    this._nextStates = transitions;
    this._stateChangedHandlers = [];
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

  assertState(state, operation = '') {
    if (!this.inState(state)) {
      throw new IllegalStateError(
        'Illegal operation for state ' +
          this._state +
          (operation.length > 0 ? ': ' + operation : '')
      );
    }
  }

  transitionTo(newState) {
    if (this._nextStates[newState] === undefined) {
      throw new IllegalStateError('Cannot set illegal state: ' + newState);
    }

    if (newState !== this._state) {
      if (this._nextStates[this._state].indexOf(newState) < 0) {
        throw new IllegalStateError(
          'Illegal state transition: ' + this._state + ' to ' + newState
        );
      }

      const oldState = this._state;
      this._state = newState;
      this._stateChangedHandlers.forEach(cb => cb(oldState, newState));
    }

    return this;
  }
}
