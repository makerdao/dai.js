import values from 'lodash.values';
import ServiceManager, { InvalidServiceError } from './ServiceManager';
import toposort from 'toposort';

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

// exported just for testing
export function orderServices(services) {
  const edges = [];
  for (let service of services) {
    const name = service.manager().name();
    const depNames = service.manager().dependencies();
    depNames.forEach(dn => edges.push([dn, name]));
  }
  return toposort(edges);
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

  // export just this function
  service(name, throwIfMissing = true) {
    if (!name) {
      throw new Error('Provide a service name.');
    }

    if (!this._services[name] && throwIfMissing) {
      throw new ServiceNotFoundError(name);
    }

    return this._services[name];
  }

  getRegisteredServiceNames() {
    return Object.keys(this._services);
  }

  injectDependencies() {
    const services = values(this._services);
    for (let service of services) {
      const manager = service.manager();
      for (let name of manager.dependencies()) {
        const dep = this._services[name];
        if (!dep) throw new ServiceNotFoundError(name);
        manager.inject(name, this._services[name]);
      }
    }
  }

  initialize() {
    return this._waitForServices(s => s.manager().initialize());
  }

  connect() {
    return this._waitForServices(s => s.manager().connect());
  }

  authenticate() {
    return this._waitForServices(s => s.manager().authenticate()).then(() => {
      this.isAuthenticated = true;
    });
  }

  async _waitForServices(callback) {
    if (!this._orderedServiceNames) {
      this._orderedServiceNames = orderServices(values(this._services));
    }
    for (let name of this._orderedServiceNames) {
      const service = this._services[name];
      if (!service) {
        throw new Error(`No service for ${name}`);
      }
      await callback(this._services[name]);
    }
  }
}

export {
  Container as default,
  InvalidServiceError,
  ServiceAlreadyRegisteredError,
  ServiceNotFoundError,
  ServiceDependencyLoopError
};
