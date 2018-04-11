import DefaultServiceProvider from './utils/DefaultServiceProvider';

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

  openCdp() {
    return this._authenticatedPromise.then(() =>
      this._container.service('cdp').openCdp()
    );
  }

  convertEthToPeth(eth) {
    return this._authenticatedPromise.then(() =>
      this._container.service('cdp').convertEthToPeth(eth)
    );
  }
}
