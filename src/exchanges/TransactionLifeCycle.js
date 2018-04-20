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
  constructor(businessObject = null) {
    this._state = new StateMachine(
      transactionState.initialized,
      transactionTypeTransitions[TransactionType.transaction]
    );
    this._businessObject = businessObject;
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
          handler(this._businessObject || this);
          resolve(this._businessObject || this);
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
          handler(this._businessObject || this);
          resolve(this._businessObject || this);
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
          handler(this._businessObject || this);
          resolve(this._businessObject || this);
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
        if (newState === transactionState.error) {
          handler(this.error(), this._businessObject || this);
          reject(this.error(), this._businessObject || this);
        }
      });
    });
  }
}

export default TransactionLifeCycle;
