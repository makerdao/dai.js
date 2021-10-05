import uniq from 'lodash/uniq';
import Container from './Container';
import standardizeConfig from './standardizeConfig';


export default class ServiceProvider {
  _config: any;
  _services: any;
  _resolver: any;
  _container: any;

  constructor(config, { services = {}, defaults = {}, disabled = {} } = {}) {
    this._config = config;

    // all the service classes that this provider should support
    this._services = services;

    // the services (as string names) that should be used for each role by
    // default, or when that role is disabled
    this._resolver = { defaults, disabled };
  }

  /**
   * @param {string} serviceName
   * @returns {boolean}
   */
  supports(serviceName) {
    return !!this._services[serviceName];
  }

  /**
   * @param {object} servicesConfig
   * @returns {Container}
   */
  buildContainer() {
    const container = new Container();

    for (let role in this._config) {
      const [service, settings] = standardizeConfig(
        role,
        this._config[role],
        this._resolver
      );

      let instance;

      // each config can contain a service descriptor in one of several forms:
      if (typeof service == 'object') {
        // instance
        instance = service;
      } else if (typeof service == 'function') {
        // constructor
        instance = new service();
      } else {
        // string
        if (!this.supports(service) && role === 'exchange') {
          throw new Error(
            'This service has been extracted from dai.js. Please refer to the documentation to add it as a plugin: \n\n https://github.com/makerdao/dai.js/wiki/Basic-Usage-(Plugins)'
          );
        }
        if (!this.supports(service)) {
          throw new Error('Unsupported service in configuration: ' + service);
        }

        instance = new this._services[service]();
      }

      const instanceName = instance.manager().name();
      if (instanceName !== role) {
        throw new Error(`Role mismatch: "${instanceName}", "${role}"`);
      }

      instance.manager().settings(settings);
      container.register(instance, role);
    }

    this._registerDependencies(container);
    container.injectDependencies();
    this._container = container;
    return container;
  }

  _registerDependencies(container) {
    const names = container.getRegisteredServiceNames();

    // get the names of all dependencies
    const allDeps = names.reduce((acc, name) => {
      const service = container.service(name);
      const deps = service.manager().dependencies();
      return uniq(acc.concat(deps));
    }, []);

    // filter out the ones that are already registered
    const newDeps = allDeps.filter(name => !names.includes(name));
    if (newDeps.length === 0) return;

    // register any remaining ones
    for (let name of newDeps) {
      let ctor = this._resolver.defaults[name];
      if (typeof ctor === 'string') ctor = this._services[ctor];
      if (!ctor) throw new Error(`No service found for "${name}"`);
      container.register(new ctor(), name);
    }

    // repeat, to find any dependencies for services that were just added
    this._registerDependencies(container);
  }

  service(name) {
    if (!this._container) this.buildContainer();
    return this._container.service(name);
  }
}
