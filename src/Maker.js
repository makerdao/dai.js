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

  //

  openCdp() {
    // this._authenticatedPromise.then(() => {
    // const hash = this._container.service('cdp').openCdp().then((obj) => { return obj.hash });

    // return new TransactionObject(
    //   hash,
    //   this._ethersProvider
    // );
    // });

    return this._authenticatedPromise.then(() =>
      this._container.service('cdp').openCdp()
    );
  }
}
