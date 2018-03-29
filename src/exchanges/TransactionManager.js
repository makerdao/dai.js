import StateMachine from '../core/StateMachine';
import oasisOrderState from './oasis/oasisOrderState';
import OrderType, { orderTypeTransitions } from './orderTransitions';

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
  constructor(type = OrderType.oasis) {
    this._type = type;
    this._state = new StateMachine(oasisOrderState.initialized, orderTypeTransitions[this._type]);
  }

    /**
   * @returns {Promise}
   */
  pending() {
    this._state.transitionTo(oasisOrderState.pending);
  }

  /**
   * @returns {Promise}
   */
  confirm() {
    this._state.transitionTo(oasisOrderState.confirmed);
  }

  /**
   * @returns {Promise}
   */
  complete() {
    this._state.transitionTo(oasisOrderState.completed);
  }

  error(){
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
      if (oldState === oasisOrderState.initialized && newState === oasisOrderState.pending) {
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
    this._state.onStateChanged((oldState, newState) => {
      if (oldState === oasisOrderState.pending && newState === oasisOrderState.confirmed) {
        handler();
      }
    });

    return this;
  }

  /**
   * @param {function} handler
   * @returns {TransactionManager}
   */
  onCompleted(handler) {
    this._state.onStateChanged((oldState, newState) => {
      if (oldState === oasisOrderState.confirmed && newState === oasisOrderState.completed) {
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
      if (oldState === (oasisOrderState.pending || oasisOrderState.confirmed) && newState === oasisOrderState.error) {
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
