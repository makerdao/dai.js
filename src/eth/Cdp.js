import TransactionObject from './TransactionObject';

export default class Cdp {
  constructor(cdpService, cdpId) {
    this._service = cdpService;
    this._id = cdpId;
    this._ethersProvider = this._service
      .get('smartContract')
      .get('web3')._ethersProvider;
  }

  shut() {
    return new TransactionObject(
      this._service.shutCdp(this._id),
      this._ethersProvider
    );
  }

  getInfo() {
    return this._service.getCdpInfo(this._id);
  }

  convertEthToPeth(eth) {
    return new TransactionObject(
      this._service.convertEthToPeth(eth),
      this._ethersProvider
    );
  }
}
