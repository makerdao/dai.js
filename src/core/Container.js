import ServiceManager, { InvalidServiceError } from './ServiceManager';

class ServiceAlreadyRegisteredError extends Error {
  constructor(name) {
    // prettier-ignore
    super('Service with name \'' + name + '\' is already registered with this container.');
  }
}

class ServiceNotFoundError extends Error {
  constructor(name) {
    // prettier-ignore
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
    if (!ServiceManager.isValidService(service)) {
      throw new InvalidServiceError(
        'Service must be an object with manager() method returning a valid ServiceManager'
      );
    }

    name = name || service.manager().name();

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
    currentStack.forEach(service =>
      service
        .manager()
        .dependencies()
        .forEach(d => {
          if (!this._services[d]) {
            throw new ServiceNotFoundError(d);
          }
        })
    );

    // Sort services in load order
    while (currentStack.length > 0) {
      currentStack.forEach(s => {
        let postponed = false;

        s
          .manager()
          .dependencies()
          .forEach(d => {
            if (!postponed && !processed[d]) {
              nextStack.push(s);
              postponed = true;
            }
          });

        if (!postponed) {
          s
            .manager()
            .dependencies()
            .forEach(d => s.manager().inject(d, this._services[d]));
          result.push(s);
          processed[s.manager().name()] = true;
        }
      });

      if (nextStack.length === currentStack.length) {
        throw new ServiceDependencyLoopError(
          currentStack.map(s => s.manager().name())
        );
      }

      currentStack = nextStack;
      nextStack = [];
    }

    // Return the resulting list
    return result;
  }

  initialize() {
    return this._waitForServices(s => s.manager().initialize());
  }

  connect() {
    return this._waitForServices(s => s.manager().connect());
  }

  authenticate() {
    return this._waitForServices(s => s.manager().authenticate());
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
