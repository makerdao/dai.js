import ServiceManagerBase from './ServiceManagerBase';

class DependencyNotResolvedError extends Error {
  constructor(service, dependency) {
    super('Dependency ' + dependency + ' of service ' + service + ' is unavailable.');
  }
}

class ServiceManager extends ServiceManagerBase {

  /**
   * @param {string} name
   * @param {string[]} dependencies
   * @param {function|null} init
   * @param {function|null} connect
   * @param {function|null} auth
   */
  constructor(name, dependencies = [], init = null, connect = null, auth = null) {
    super(init, connect, auth);

    if (!name) {
      throw new Error('Service name must not be empty.');
    }

    this._name = name;
    this._deps = dependencies;
    this._deps.forEach(d => this[d] = null);
  }

  getName() {
    return this._name;
  }

  getDependencies() {
    return this._deps;
  }

  initializeDependencies() {
    return this._waitForDependencies(d => this._dependency(d).initialize());
  }

  connectDependencies() {
    return this._waitForDependencies(d => this._dependency(d).connect());
  }

  authenticateDependencies() {
    return this._waitForDependencies(d => this._dependency(d).authenticate());
  }

  _waitForDependencies(callback) {
    return Promise.all(this.getDependencies().map(dependency => callback(dependency)));
  }

  _dependency(name) {
    if (!(this[name] instanceof ServiceManager)) {
      throw new DependencyNotResolvedError(this, name);
    }

    return this[name];
  }
}

export {
  ServiceManager as default,
  DependencyNotResolvedError
};