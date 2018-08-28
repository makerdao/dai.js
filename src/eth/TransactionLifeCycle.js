import StateMachine from '../core/StateMachine';
import transactionState from '../eth/TransactionState';
import TransactionType, {
  transactionTypeTransitions
} from './TransactionTransitions';

const { initialized, pending, mined, finalized, error } = transactionState;
const stateOrder = [initialized, pending, mined, finalized];

class TransactionLifeCycle {
  constructor(businessObject = null) {
    this._state = new StateMachine(
      initialized,
      transactionTypeTransitions[TransactionType.transaction]
    );
    this._businessObject = businessObject;
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

  _inOrPastState(state) {
    const currentIndex = stateOrder.indexOf(this.state());
    const targetIndex = stateOrder.indexOf(state);
    if (currentIndex === -1 || targetIndex === -1) {
      throw new Error('invalid state');
    }
    return currentIndex >= targetIndex;
  }

  _onStateChange(from, to, handler) {
    if (this.isError()) return Promise.reject(this.error);
    if (this._inOrPastState(to)) return Promise.resolve(this._returnValue());
    return new Promise((resolve, reject) => {
      this._state.onStateChanged((oldState, newState) => {
        if (oldState === from && newState === to) {
          if (handler) handler(this._returnValue());
          resolve(this._returnValue());
        }
        if (newState === error) reject(this.error);
      });
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
    if (this.isError()) return Promise.reject();
    return new Promise((resolve, reject) => {
      this._state.onStateChanged((oldState, newState) => {
        if (newState === error) {
          if (handler) handler(this.error, this._returnValue());
          reject(this.error, this._returnValue());
        }
      });
    });
  }
}

export default TransactionLifeCycle;
