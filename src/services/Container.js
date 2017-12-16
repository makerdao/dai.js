import Service from './Service';

class InvalidServiceError extends Error {
  constructor(message) {
    super(message);
  }
}

class ServiceAlreadyRegisteredError extends Error {
  constructor(name) {
    super('Service with name \'' + name + '\' is already registered with this container.');
  }
}

class ServiceNotFoundError extends Error {
  constructor(name) {
    super('Service with name \'' + name + '\' cannot be found in this container.');
  }
}

class ServiceDependencyLoopError extends Error {
  constructor(names) {
    super('Service dependency loop in {' + names.join(', ') + '}');
  }
}

class Container {

  constructor() {
    this._services = {};
  }

  register(service, name = null) {
    if (!(service instanceof Service)) {
      throw new InvalidServiceError('Object must be of type Service');
    }

    name = name || service.getName();

    const s = this.service(name, false);
    if (s !== undefined && s !== service) {
      throw new ServiceAlreadyRegisteredError(name);
    }

    this._services[name] = service;
    return this;
  }

  service(name, throwIfMissing = true) {
    if (!name) {
      throw new Error('Provide a service name.');
    }

    if (!this._services[name] && throwIfMissing) {
      throw new ServiceNotFoundError(name);
    }

    return this._services[name];
  }

  getServices() {
    const result = [];
    const processed = {};
    let nextStack = [];
    let currentStack = Object.keys(this._services)
      .filter(k => this._services.hasOwnProperty(k))
      .map(k => this._services[k]);

    // Check if all dependencies are registered.
    currentStack.forEach(service => service.getDependencies().forEach(d => {
      if (!this._services[d]) {
        throw new ServiceNotFoundError(d);
      }
    }));

    // Sort services in load order
    while (currentStack.length > 0) {
      currentStack.forEach(s => {
        let postponed = false;

        s.getDependencies().forEach(d => {
          if (!postponed && !processed[d]) {
            nextStack.push(s);
            postponed = true;
          }
        });

        if (!postponed) {
          s.getDependencies().forEach(d => s[d] = this._services[d]);
          result.push(s);
          processed[s.getName()] = true;
        }
      });

      if (nextStack.length === currentStack.length) {
        throw new ServiceDependencyLoopError(currentStack.map(s => s.getName()));
      }

      currentStack = nextStack;
      nextStack = [];
    }

    // Return the resulting list
    return result;
  }

  initialize() {
    return this._waitForServices(s => s._initializeDependencies().then(() => s.initialize()));
  }

  connect() {
    return this._waitForServices(s => s._connectDependencies().then(() => s.connect()));
  }

  _waitForServices(callback) {
    return Promise.all(this.getServices().map(s => callback(s)));
  }
}

export {
  Container as default,
  InvalidServiceError,
  ServiceAlreadyRegisteredError,
  ServiceNotFoundError,
  ServiceDependencyLoopError
};
