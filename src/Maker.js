import DefaultServiceProvider from './utils/DefaultServiceProvider';
import TransactionObject from './eth/TransactionObject';
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

  // TODO:
  openCdp() {
    // This method invokes new Cdp()
    // then calls cdp.open(), enabling
    // cdp lifecycle events while still
    // allowing us to return the cdp itself

    this._authenticatedPromise.then(() => {
      // this._container.service('cdp').openCdp()
      cdp.open().then(transaction => {
        return new Promise((resolve, reject) => {
          try {
            resolve({
              cdp: cdp,
              transaction: transaction
            });
          } catch (error) {
            reject(message.error);
          }
        });
      });
    });
  }
}
