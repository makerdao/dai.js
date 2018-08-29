import DefaultServiceProvider, {
  resolver
} from './config/DefaultServiceProvider';
import ConfigFactory from './config/ConfigFactory';

export default class Maker {
  constructor(preset, options = {}) {
    const config = ConfigFactory.create(preset, options, resolver);
    this._container = new DefaultServiceProvider(config).buildContainer();
    if (options.plugins) {
      for (let plugin of options.plugins) {
        plugin(this, config);
      }
    }
    if (options.autoAuthenticate !== false) this.authenticate();

    delegateToServices(this, {
      accounts: [
        'addAccount',
        'currentAccount',
        'currentAddress',
        'listAccounts',
        'useAccount'
      ],
      cdp: ['getCdp', 'openCdp'],
      event: ['on'],
      token: ['getToken']
    });
  }

  authenticate() {
    if (!this._authenticatedPromise) {
      this._authenticatedPromise = this._container.authenticate();
    }
    return this._authenticatedPromise;
  }

  // skipAuthCheck should only be set if you're sure you don't need the service
  // to be initialized yet, e.g. when setting up a plugin
  service(service, skipAuthCheck) {
    if (!skipAuthCheck && !this._container.isAuthenticated) {
      throw new Error('this.authenticate() did not finish yet.');
    }
    return this._container.service(service);
  }
}

function delegateToServices(maker, services) {
  for (const serviceName in services) {
    for (const methodName of services[serviceName]) {
      maker[methodName] = (...args) =>
        maker.service(serviceName)[methodName](...args);
    }
  }
}

// This factory function doesn't do much at the moment, but it will give us
// more flexibility for plugins and extensions in the future.
Maker.create = function(...args) {
  return new Maker(...args);
};
