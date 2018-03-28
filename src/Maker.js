import DefaultServiceProvider from './utils/DefaultServiceProvider';

export default class Maker {
  // config = ConfigFactory.create('decentralized-oasis-without-proxies')
  constructor(config) {
    this._container = new DefaultServiceProvider().buildContainer(
      config.services
    );
    this._authenticatedPromise = this._container.authenticate();
  }

  openCdp() {
    return this._authenticatedPromise.then(() =>
      this._container.service('cdp').openCdp()
    );
  }

  // timer() {
  //   return this._authenticatedPromise.then(() => this._container.service('timer'));
  // }
}
