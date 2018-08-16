import DefaultServiceProvider, {
  resolver
} from './config/DefaultServiceProvider';
import Cdp from './eth/Cdp';
import ConfigFactory from './config/ConfigFactory';

export default class Maker {
  constructor(preset, options = {}) {
    const config = ConfigFactory.create(preset, options, resolver);
    this._container = new DefaultServiceProvider(config).buildContainer();
    if (options.plugins) {
      for (let plugin of options.plugins) {
        plugin(this);
      }
    }
    if (options.autoAuthenticate !== false) this.authenticate();
  }

  on(event, listener) {
    this._container.service('event').on(event, listener);
  }

  authenticate() {
    if (!this._authenticatedPromise) {
      this._authenticatedPromise = this._container.authenticate();
    }
    return this._authenticatedPromise;
  }

  service(service) {
    return this._container.service(service);
  }

  async openCdp() {
    await this._authenticatedPromise;
    return this._container.service('cdp').openCdp();
  }

  async getCdp(id) {
    await this._authenticatedPromise;
    return Cdp.find(id, this._container.service('cdp'));
  }
}

// This factory function doesn't do much at the moment, but it will give us
// more flexibility for plugins and extensions in the future.
Maker.create = function(...args) {
  return new Maker(...args);
};
