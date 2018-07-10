import DefaultServiceProvider from './config/DefaultServiceProvider';
import Cdp from './eth/Cdp';
import ConfigFactory from './config/ConfigFactory';

export default class Maker {
  constructor(preset, options = {}) {
    const config = ConfigFactory.create(preset, options);
    this._container = new DefaultServiceProvider(
      config.services
    ).buildContainer();
    if (options.autoAuthenticate !== false) this.authenticate();
  }

  _validateCdp(cdpId) {
    return this._authenticatedPromise.then(() => {
      if (typeof cdpId !== 'number') {
        throw new Error('ID must be a number.');
      }

      return this._container
        .service('cdp')
        .getInfo(cdpId)
        .then(info => {
          if (
            info.lad.toString() === '0x0000000000000000000000000000000000000000'
          ) {
            // eslint-disable-next-line
            throw new Error("That CDP doesn't exist--try opening a new one.");
          }
          return true;
        });
    });
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

  openCdp() {
    return this._authenticatedPromise.then(() =>
      this._container.service('cdp').openCdp()
    );
  }

  getCdp(cdpId) {
    return this._authenticatedPromise.then(() =>
      this._validateCdp(cdpId).then(
        () => new Cdp(this._container.service('cdp'), cdpId)
      )
    );
  }
}
