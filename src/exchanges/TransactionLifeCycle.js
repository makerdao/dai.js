import StateMachine from '../core/StateMachine';
import transactionState from '../eth/TransactionState';
import TransactionType, {
  transactionTypeTransitions
} from './TransactionTransitions';

// eslint-disable-next-line
function _promisify(unsafeCallback) {
  return new Promise((resolve, reject) => {
    try {
      resolve(unsafeCallback());
    } catch (e) {
      reject(e.message);
    }
  });
}

class TransactionLifeCycle {
  constructor(type = TransactionType.transaction) {
    this._type = type;
    this._state = new StateMachine(
      transactionState.initialized,
      transactionTypeTransitions[this._type]
    );
  }

  _pending() {
    this._state.transitionTo(transactionState.pending);
  }

  _mine() {
    this._state.transitionTo(transactionState.mined);
  }

  _finalize() {
    this._state.transitionTo(transactionState.finalized);
  }

  _error() {
    this._state.transitionTo(transactionState.error);
  }

  state() {
    return this._state.state();
  }

  type() {
    return this._type;
  }

  /**
   * @returns {boolean}
   */
  isInitialized() {
    return this._state.inState(transactionState.initialized);
  }

  /**
   * @returns {boolean}
   */
  isPending() {
    return this._state.inState(transactionState.pending);
  }

  /**
   * @returns {boolean|null}
   */
  isMined() {
    return this._state.inState(transactionState.mined);
  }

  /**
   * @returns {boolean|null}
   */
  isFinalized() {
    return this._state.inState(transactionState.finalized);
  }

  /**
   * @returns {boolean}
   */
  isError() {
    return this._state.inState(transactionState.error);
  }

  onPending(handler = () => {}) {
    return new Promise((resolve, reject) => {
      this._state.onStateChanged((oldState, newState) => {
        if (
          oldState === transactionState.initialized &&
          newState === transactionState.pending
        ) {
          handler(this);
          resolve(this);
        }
        if (newState === transactionState.error) {
          reject();
        }
      });
    });
  }

  onMined(handler = () => {}) {
    return new Promise((resolve, reject) => {
      this._state.onStateChanged((oldState, newState) => {
        if (
          oldState === transactionState.pending &&
          newState === transactionState.mined
        ) {
          handler(this);
          resolve(this);
        }
        if (newState === transactionState.error) {
          reject();
        }
      });
    });
  }

  onFinalized(handler = () => {}) {
    return new Promise((resolve, reject) => {
      this._state.onStateChanged((oldState, newState) => {
        if (
          oldState === transactionState.mined &&
          newState === transactionState.finalized
        ) {
          handler(this);
          resolve(this);
        }
        if (newState === transactionState.error) {
          reject();
        }
      });
    });
  }

  onError(handler = () => {}) {
    return new Promise((resolve, reject) => {
      this._state.onStateChanged((oldState, newState) => {
        if (
          newState === transactionState.error
        ) {
          console.log("about to call onError handler/resolve");
          handler(this);
          resolve(this);
        }
      });
    });
  }

  onStateChanged(handler) {
    this._state.onStateChanged(handler);
    return this;
  }
}

export default TransactionLifeCycle;
