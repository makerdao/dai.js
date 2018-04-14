import DefaultServiceProvider from './utils/DefaultServiceProvider';
import Cdp from './eth/Cdp';

export default class Maker {
  constructor(config) {
    this._container = new DefaultServiceProvider().buildContainer(
      config.services
    );
    this._authenticatedPromise = this._container.authenticate().then(() => {
      this._ethersProvider = this._container
        .service('cdp')
        .get('smartContract')
        .get('web3')._ethersProvider;
    });
  }

  _validateCdp(cdpId) {
    return this._authenticatedPromise.then(() => {
      if (typeof cdpId !== 'number') {
        return new Error('ID must be a number.');
      } else {
        return this._container.service('cdp')
        .getCdpInfo(cdpId)
        .then(info => {
          if (info.lad === '0x0000000000000000000000000000000000000000') {
            return new Error('That CDP doesn\'t exist--try opening a new one.');
          } else {
            console.log(cdpId, typeof cdpId);
              return true;
            }
          });
      }
    });
  }

  openCdp() {
    return this._authenticatedPromise.then(() =>
      this._container.service('cdp').openCdp()
    );
  }


  // Move validation method here
  // Should check if this CDP actually exists
  // Should be number
  // Should return promise
  // if (!validCdp) return Promise.reject(error.message)
  getCdp(cdpId) {
    return this._authenticatedPromise.then(() => {
      return new Promise((resolve, reject) => {
        const result = this._validateCdp(cdpId)
        // console.log(result);
        if (result === true) {
          return resolve(new Cdp(this._container.service('cdp'), cdpId));
        }

        return reject(result);
      }); 
    });
  }

  convertEthToPeth(eth) {
    return this._authenticatedPromise.then(() =>
      this._container.service('cdp').convertEthToPeth(eth)
    );
  }
}
