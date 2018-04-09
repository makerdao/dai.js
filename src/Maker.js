import DefaultServiceProvider from './utils/DefaultServiceProvider';
import TransactionObject from './eth/TransactionObject';

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

    return this._authenticatedPromise.then(() =>
      this._container.service('cdp').openCdp()
    );
  }
}
