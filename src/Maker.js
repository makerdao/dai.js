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
      return new Promise((resolve, reject) => {
        if (typeof cdpId !== 'number') {
          reject(new Error('ID must be a number.'));
        }

        this._container
          .service('cdp')
          .getCdpInfo(cdpId)
          .then(info => {
            if (
              info.lad.toString() ===
              '0x0000000000000000000000000000000000000000'
            ) {
              reject(
                // eslint-disable-next-line
                new Error("That CDP doesn't exist--try opening a new one.")
              );
            } else {
              resolve(true);
            }
          });
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
    return this._authenticatedPromise.then(() => {
      return new Promise((resolve, reject) => {
        try {
          this._validateCdp(cdpId).then(() => {
            resolve(new Cdp(this._container.service('cdp'), cdpId));
          });
        } catch (error) {
          reject(error.message);
        }
      });
    });
  }
}
