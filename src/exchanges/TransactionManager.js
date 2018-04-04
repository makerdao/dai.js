import StateMachine from '../core/StateMachine';
import oasisOrderState from './oasis/OasisOrderState';
import OrderType, { orderTypeTransitions } from './orderTransitions';

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
  constructor(type = OrderType.oasis, wrapperObject) {
    this._type = type;
    this.wrapperObject = wrapperObject;
    this._state = new StateMachine(
      oasisOrderState.initialized,
      orderTypeTransitions[this._type]
    );
  }

  /**
   * @returns {Promise}
   */
  _pending() {
    this._state.transitionTo(oasisOrderState.pending);
  }

  /**
   * @returns {Promise}
   */
  _confirm() {
    this._state.transitionTo(oasisOrderState.confirmed);
  }

  /**
   * @returns {Promise}
   */
  _complete() {
    this._state.transitionTo(oasisOrderState.completed);
  }

  _error() {
    this._state.transitionTo(oasisOrderState.error);
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
    return this._state.inState(oasisOrderState.initialized);
  }

  /**
   * @returns {boolean}
   */
  isPending() {
    return this._state.inState(oasisOrderState.pending);
  }

  /**
   * @returns {boolean|null}
   */
  isConfirmed() {
    return this._state.inState(oasisOrderState.confirmed);
  }

  /**
   * @returns {boolean|null}
   */
  isCompleted() {
    return this._state.inState(oasisOrderState.completed);
  }

  /**
   * @returns {boolean}
   */
  isError() {
    return this._state.inState(oasisOrderState.error);
  }

  /**
   * @param {function} handler
   * @returns {TransactionManager}
   */
  onPending(handler) {
    this._state.onStateChanged((oldState, newState) => {
      if (
        oldState === oasisOrderState.initialized &&
        newState === oasisOrderState.pending
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
  onConfirmed(handler) {
    return new Promise((resolve,reject) => {
      this._state.onStateChanged((oldState, newState) => {
      if (
        oldState === oasisOrderState.pending &&
        newState === oasisOrderState.confirmed
      ) {
        handler(this.wrapperObject);
        resolve(this.wrapperObject);
      }
    });
    });
  }

  onConfirmedPromise(){
    return new Promise((resolve,reject) => {
         this.onConfirmed(resolve);
    });
  }

  /**
   * @param {function} handler
   * @returns {TransactionManager}
   */
  onCompleted(handler) {
    this._state.onStateChanged((oldState, newState) => {
      if (
        oldState === oasisOrderState.confirmed &&
        newState === oasisOrderState.completed
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
        oldState === (oasisOrderState.pending || oasisOrderState.confirmed) &&
        newState === oasisOrderState.error
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
