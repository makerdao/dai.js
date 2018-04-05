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

class TransactionManager {
  /**
   * @param init {function|null}
   * @param connect {function|null}
   * @param auth {function|null}
   */
  constructor(type = TransactionType.oasis) {
    /*super((resolve,reject)=>{
      /*this.onMined(()=>{
        resolve(this);
      });
      this.onError(()=>{
        reject(this);
      });*/
    //});
    this._type = type;
    this._state = new StateMachine(
      transactionState.initialized,
      transactionTypeTransitions[this._type]
    );
  }

  /**
   * @returns {Promise}
   */
  _pending() {
    this._state.transitionTo(transactionState.pending);
  }

  /**
   * @returns {Promise}
   */
  _mine() {
    this._state.transitionTo(transactionState.mined);
  }

  /**
   * @returns {Promise}
   */
  _finalize() {
    this._state.transitionTo(transactionState.finalized);
  }

  _error() {
    this._state.transitionTo(transactionState.error);
  }

  /**
   * @returns {string}
   */
  state() {
    return this._state.state();
  }

  /**
   * @returns {string}
   */
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

  /**
   * @param {function} handler
   * @returns {TransactionManager}
   */
  onPending(handler) {
    this._state.onStateChanged((oldState, newState) => {
      if (
        oldState === transactionState.initialized &&
        newState === transactionState.pending
      ) {
        handler();
      }
    });

    return this;
  }

  /**
   * @param {function} handler
   * @returns {TransactionManager}
   */
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

  /**
   * @param {function} handler
   * @returns {TransactionManager}
   */
  onFinalized(handler) {
    this._state.onStateChanged((oldState, newState) => {
      if (
        oldState === transactionState.mined &&
        newState === transactionState.finalized
      ) {
        handler();
      }
    });

    return this;
  }

  /**
   * @param {function} handler
   * @returns {TransactionManager}
   */
  onError(handler) {
    this._state.onStateChanged((oldState, newState) => {
      if (
        oldState ===
          (transactionState.initialized ||
            transactionState.pending ||
            transactionState.mined) &&
        newState === transactionState.error
      ) {
        handler();
      }
    });

    return this;
  }

  /**
   * @param {function} handler
   * @returns {ServiceManagerBase}
   */
  onStateChanged(handler) {
    this._state.onStateChanged(handler);
    return this;
  }
}

export default TransactionManager;
