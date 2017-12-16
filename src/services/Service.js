
class DependencyNotResolvedError extends Error {
  constructor(service, dependency) {
    super('Dependency ' + dependency + ' of service ' + service + ' is unavailable.');
  }
}

class Service {
  constructor(name, dependencies = []) {
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

  initialize() {
    return Promise.resolve(true);
  }

  connect() {
    return Promise.resolve(true);
  }

  _initializeDependencies() {
    return this._waitForDependencies(d => this._dependency(d).initialize());
  }

  _connectDependencies() {
    return this._waitForDependencies(d => this._dependency(d).connect());
  }

  _waitForDependencies(callback) {
    return Promise.all(this.getDependencies().map(dependency => callback(dependency)));
  }

  _dependency(name) {
    if (!(this[name] instanceof Service)) {
      throw new DependencyNotResolvedError(this, name);
    }

    return this[name];
  }
}

export {
  Service as default,
  DependencyNotResolvedError
};