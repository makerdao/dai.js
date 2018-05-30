import DefaultServiceProvider from './utils/DefaultServiceProvider';
import Cdp from './eth/Cdp';

export default class Maker {
  constructor(config) {
    this._container = new DefaultServiceProvider().buildContainer(
      config.services
    );
    this._authenticatedPromise = this._container.authenticate();
  }

  _validateCdp(cdpId) {
    return this._authenticatedPromise.then(() => {
      if (typeof cdpId !== 'number') {
        throw new Error('ID must be a number.');
      }

      return this._container
        .service('cdp')
        .getCdpInfo(cdpId)
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

  authenticate() {
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
