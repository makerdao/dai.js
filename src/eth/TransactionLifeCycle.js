import StateMachine from '../core/StateMachine';
import transactionState from '../eth/TransactionState';
import TransactionType, {
  transactionTypeTransitions
} from './TransactionTransitions';

const { initialized, pending, mined, finalized, error } = transactionState;
const stateOrder = [initialized, pending, mined, finalized];

class TransactionLifeCycle {
  constructor(businessObject) {
    this._state = new StateMachine(
      initialized,
      transactionTypeTransitions[TransactionType.transaction]
    );
    this._businessObject = businessObject;
    this.onConfirmed = this.onFinalized;
  }

  setPending() {
    this._state.transitionTo(pending);
  }

  setMined() {
    this._state.transitionTo(mined);
  }

  setFinalized() {
    this._state.transitionTo(finalized);
  }

  setError(errorObject) {
    this.error = errorObject;
    this._state.transitionTo(error);
  }

  state() {
    return this._state.state();
  }

  /**
   * @returns {boolean}
   */
  isInitialized() {
    return this._state.inState(initialized);
  }

  /**
   * @returns {boolean}
   */
  isPending() {
    return this._state.inState(pending);
  }

  /**
   * @returns {boolean|null}
   */
  isMined() {
    return this._state.inState(mined);
  }

  /**
   * @returns {boolean|null}
   */
  isFinalized() {
    return this._state.inState(finalized);
  }

  /**
   * @returns {boolean}
   */
  isError() {
    return this._state.inState(error);
  }

  _returnValue() {
    return this._businessObject || this;
  }

  inOrPastState(state) {
    const currentState = this.state();
    if (state === currentState) return true;

    const currentIndex = stateOrder.indexOf(currentState);
    const targetIndex = stateOrder.indexOf(state);
    if (currentIndex === -1 || targetIndex === -1) {
      throw new Error('invalid state');
    }
    return currentIndex >= targetIndex;
  }

  _onStateChange(from, to, handler) {
    this._state.onStateChanged((oldState, newState) => {
      if (oldState === from && newState === to) {
        handler(this._returnValue());
      }
    });
  }

  onPending(handler) {
    return this._onStateChange(initialized, pending, handler);
  }

  onMined(handler) {
    return this._onStateChange(pending, mined, handler);
  }

  onFinalized(handler) {
    return this._onStateChange(mined, finalized, handler);
  }

  onError(handler) {
    this._state.onStateChanged((oldState, newState) => {
      if (newState === error) {
        handler(this.error, this._returnValue());
      }
    });
  }

  on(state, handler) {
    if (state === error) return this.onError(handler);
    if (!Object.keys(transactionState).includes(state)) {
      throw new Error(`Unrecognized state "${state}"`);
    }
    const prevState = stateOrder[stateOrder.indexOf(state) - 1];
    return this._onStateChange(prevState, state, handler);
  }
}

export default TransactionLifeCycle;
