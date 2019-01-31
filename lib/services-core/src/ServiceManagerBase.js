import StateMachine from './StateMachine';
import ServiceState from './ServiceState';
import ServiceType, { serviceTypeTransitions } from './ServiceType';
import debug from 'debug';

const log = debug('dai:ServiceManagerBase');

function _promisify(unsafeCallback) {
  return new Promise((resolve, reject) => {
    try {
      resolve(unsafeCallback());
    } catch (e) {
      reject(e.message);
    }
  });
}

class ServiceManagerBase {
  /**
   * @param init {function|null}
   * @param connect {function|null}
   * @param auth {function|null}
   */
  constructor(init = null, connect = null, auth = null) {
    // Validate init
    if (init !== null && typeof init !== 'function') {
      throw new Error('Invalid argument init: not a function or null.');
    } else if (init === null) {
      init = () => Promise.resolve();
    }

    // Validate connect
    if (connect !== null && typeof connect !== 'function') {
      throw new Error('Invalid argument connect: not a function or null.');
    } else if (connect === null && auth !== null) {
      connect = () => Promise.resolve();
    }

    // Validate auth
    if (auth !== null && typeof auth !== 'function') {
      throw new Error('Invalid argument auth: not a function or null.');
    }

    // Set initial props
    this._init = init;
    this._connect = connect;
    this._auth = auth;
    this._type =
      auth === null
        ? connect === null
          ? ServiceType.LOCAL
          : ServiceType.PUBLIC
        : ServiceType.PRIVATE;
    this._state = new StateMachine(
      ServiceState.CREATED,
      serviceTypeTransitions[this._type]
    );
    this._initPromise = null;
    this._connectPromise = null;
    this._authPromise = null;
  }

  /**
   * @returns {Promise}
   */
  initialize(settings) {
    // If our current state is preceding the INITIALIZING state, we need to set up initialization
    if (this._state.inState(ServiceState.CREATED)) {
      // Assert that there is no initPromise at this point
      /* istanbul ignore next */
      if (this._initPromise) {
        throw new Error('Unexpected init promise in state CREATED.');
      }

      // Enter the INITIALIZING state
      this._state.transitionTo(ServiceState.INITIALIZING);

      // After trying to initialize, transition to the success state (READY/OFFLINE) or revert to CREATED
      this._initPromise = _promisify(() => this._init(settings)).then(
        () =>
          this._state.transitionTo(
            this._type === ServiceType.LOCAL
              ? ServiceState.READY
              : ServiceState.OFFLINE
          ),
        reason => {
          log(reason);
          this._state.transitionTo(ServiceState.CREATED);
          throw reason;
        }
      );
    }

    return this._initPromise;
  }

  /**
   * @returns {Promise}
   */
  connect() {
    // Local Services are 'connected' whenever they are initialized
    if (this._type === ServiceType.LOCAL) {
      return this.initialize();
    }

    // If our current state is preceding the CONNECTING state, we need to set up a new connection
    if (
      this._state.inState([
        ServiceState.CREATED,
        ServiceState.INITIALIZING,
        ServiceState.OFFLINE
      ]) &&
      this._connectPromise === null
    ) {
      // Make sure to be initialized before trying to connect
      this._connectPromise = this.initialize().then(() => {
        // Enter the CONNECTING state
        this._state.transitionTo(ServiceState.CONNECTING);

        // After trying to connect, transition to the success state (ONLINE/READY) or revert to OFFLINE.
        return _promisify(() => this._connect(() => this._disconnect())).then(
          () => {
            // Check if we are still CONNECTING, because another process might have come in between
            if (this._state.inState(ServiceState.CONNECTING)) {
              this._state.transitionTo(
                this._type === ServiceType.PUBLIC
                  ? ServiceState.READY
                  : ServiceState.ONLINE
              );
            }
          },
          error => {
            log('connect error:', error);
            // Check if we are still CONNECTING, because another process might have come in between
            if (this._state.inState(ServiceState.CONNECTING)) {
              this._state.transitionTo(ServiceState.OFFLINE);
            }
            throw error;
          }
        );
      });
    }

    return this._connectPromise;
  }

  /**
   * @returns {Promise}
   */
  authenticate() {
    // Public and Local Services are 'authenticated' whenever they are connected (/initialized)
    if (this._type !== ServiceType.PRIVATE) {
      return this.connect();
    }

    // If our current state is preceding the AUTHENTICATING state, we need to set up a new authentication
    if (
      this._state.inState([
        ServiceState.CREATED,
        ServiceState.INITIALIZING,
        ServiceState.OFFLINE,
        ServiceState.CONNECTING,
        ServiceState.ONLINE
      ]) &&
      this._authPromise === null
    ) {
      // Make sure to be connected before trying to authenticate
      this._authPromise = this.connect().then(() => {
        // Enter the AUTHENTICATING state
        this._state.transitionTo(ServiceState.AUTHENTICATING);

        // After trying to authenticate, transition to the success state (READY) or revert to ONLINE
        return _promisify(() => this._auth(() => this._deauthenticate())).then(
          () => {
            // Check if we are still AUTHENTICATING, because another process might have come in between
            // (Most notably, a disconnect may have transitioned us into OFFLINE state).
            if (this._state.inState(ServiceState.AUTHENTICATING)) {
              this._state.transitionTo(ServiceState.READY);
            }
          },
          reason => {
            log('authenticate error: ' + reason);
            // Check if we are still AUTHENTICATING, because another process might have come in between
            if (this._state.inState(ServiceState.AUTHENTICATING)) {
              this._state.transitionTo(ServiceState.ONLINE);
            }
          }
        );
      });
    }

    return this._authPromise;
  }

  /**
   * @returns { ServiceManagerBase }
   */
  settings(settings) {
    this._settings = settings;
    return this;
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
    return !this._state.inState([
      ServiceState.CREATED,
      ServiceState.INITIALIZING
    ]);
  }

  /**
   * @returns {boolean|null}
   */
  isConnected() {
    return this._type === ServiceType.LOCAL
      ? null
      : this._state.inState([
          ServiceState.ONLINE,
          ServiceState.AUTHENTICATING,
          ServiceState.READY
        ]);
  }

  /**
   * @returns {boolean|null}
   */
  isAuthenticated() {
    return this._type === ServiceType.PRIVATE
      ? this._state.inState(ServiceState.READY)
      : null;
  }

  /**
   * @returns {boolean}
   */
  isReady() {
    return this._state.inState(ServiceState.READY);
  }

  /**
   * @param {function} handler
   * @returns {ServiceManagerBase}
   */
  onInitialized(handler) {
    this._state.onStateChanged((oldState, newState) => {
      if (
        oldState === ServiceState.INITIALIZING &&
        (newState === ServiceState.OFFLINE || newState === ServiceState.READY)
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
  onConnected(handler) {
    this._state.onStateChanged((oldState, newState) => {
      if (
        oldState === ServiceState.CONNECTING &&
        (newState === ServiceState.ONLINE || newState === ServiceState.READY)
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
  onDisconnected(handler) {
    this._state.onStateChanged((oldState, newState) => {
      if (
        newState === ServiceState.OFFLINE &&
        (oldState === ServiceState.ONLINE || oldState === ServiceState.READY)
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
  onAuthenticated(handler) {
    this._state.onStateChanged((oldState, newState) => {
      if (
        oldState === ServiceState.AUTHENTICATING &&
        newState === ServiceState.READY
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
  onDeauthenticated(handler) {
    if (this.type() === ServiceType.PRIVATE) {
      this._state.onStateChanged((oldState, newState) => {
        if (
          (newState === ServiceState.OFFLINE ||
            newState === ServiceState.ONLINE) &&
          oldState === ServiceState.READY
        ) {
          handler();
        }
      });
    }

    return this;
  }

  /**
   * @param {function} handler
   * @returns {ServiceManagerBase}
   */
  onReady(handler) {
    this._state.onStateChanged((_, newState) => {
      if (newState === ServiceState.READY) {
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

  /**
   * This is called by the service implementation object, which is the only authority with knowledge on the true
   * connection status. This will e.g. get called when a ping signal is no longer returned by the back-end and the
   * service implementation object concludes that we are therefore offline.
   *
   * @private
   */
  _disconnect() {
    /* istanbul ignore next */
    if (this._type === ServiceType.LOCAL) {
      throw new Error('_disconnect must not be called on a Local Service');
    }

    if (this._state.inState(ServiceState.AUTHENTICATING)) {
      this._deauthenticate();
    }

    if (
      this._state.inState([
        ServiceState.READY,
        ServiceState.ONLINE,
        ServiceState.CONNECTING
      ])
    ) {
      this._authPromise = null;
      this._connectPromise = null;

      this._state.transitionTo(ServiceState.OFFLINE);
    }
  }

  /**
   * This is called by the service implementation object, which is the only authority with knowledge on the true
   * authentication status. This will e.g. get called when an authentication token expires or a user logs out, and the
   * service implementation object concludes that we are therefore no longer authenticated.
   *
   * @private
   */
  _deauthenticate() {
    /* istanbul ignore next */
    if (this._type !== ServiceType.PRIVATE) {
      throw new Error(
        '_deauthenticate must not be called on a Local or Public Service'
      );
    }

    if (
      this._state.inState([ServiceState.READY, ServiceState.AUTHENTICATING])
    ) {
      this._authPromise = null;
      this._state.transitionTo(ServiceState.ONLINE);
    }
  }
}

export default ServiceManagerBase;
