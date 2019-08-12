import ServiceManagerBase from './ServiceManagerBase';

/**
 *
 */
class InvalidServiceError extends Error {
  constructor(message) {
    super(message);
  }
}

/**
 *
 */
class UnknownDependencyError extends Error {
  constructor(service, dependency) {
    super(
      'Injected service ' + dependency + ' is not a dependency of ' + service
    );
  }
}

/**
 *
 */
class DependencyNotResolvedError extends Error {
  constructor(service, dependency) {
    super(
      'Dependency ' + dependency + ' of service ' + service + ' is unavailable.'
    );
  }
}

/**
 * @param callback
 * @returns {Promise}
 * @private
 */
function _waitForDependencies(callback) {
  return Promise.all(
    this.dependencies().map(dependency => callback(dependency))
  );
}

/**
 *
 */
class ServiceManager extends ServiceManagerBase {
  /**
   * @param {*} service
   * @returns {boolean}
   */
  static isValidService(service) {
    return (
      service !== null &&
      typeof service === 'object' &&
      typeof service.manager === 'function'
    );
  }

  /**
   * @param {string} name
   * @param {string[]} dependencies
   * @param {function|null} init
   * @param {function|null} connect
   * @param {function|null} auth
   */
  constructor(
    name,
    dependencies = [],
    init = null,
    connect = null,
    auth = null
  ) {
    super(init, connect, auth);
    if (!name) {
      throw new Error('Service name must not be empty.');
    }

    this._name = name;
    this._dependencies = dependencies;
    this._injections = {};
    dependencies.forEach(d => (this._injections[d] = null));
  }

  name() {
    return this._name;
  }

  dependencies() {
    return this._dependencies;
  }

  inject(dependency, service) {
    if (typeof this._injections[dependency] === 'undefined') {
      throw new UnknownDependencyError(this.name(), dependency);
    }

    if (!ServiceManager.isValidService(service)) {
      throw new InvalidServiceError(
        'Cannot inject invalid service in ' + this.name()
      );
    }

    this._injections[dependency] = service;

    return this;
  }

  dependency(name) {
    if (!this._injections[name]) {
      throw new DependencyNotResolvedError(this.name(), name);
    }

    return this._injections[name];
  }

  initialize() {
    return this.initializeDependencies().then(() =>
      super.initialize(this._settings)
    );
  }

  connect() {
    return this.connectDependencies().then(() => super.connect());
  }

  authenticate() {
    return this.authenticateDependencies().then(() => super.authenticate());
  }

  initializeDependencies() {
    return _waitForDependencies.call(this, d =>
      this.dependency(d)
        .manager()
        .initialize()
    );
  }

  connectDependencies() {
    return _waitForDependencies.call(this, d =>
      this.dependency(d)
        .manager()
        .connect()
    );
  }

  authenticateDependencies() {
    return _waitForDependencies.call(this, d =>
      this.dependency(d)
        .manager()
        .authenticate()
    );
  }

  createService() {
    return { manager: () => this };
  }
}

export {
  ServiceManager as default,
  InvalidServiceError,
  UnknownDependencyError,
  DependencyNotResolvedError
};
