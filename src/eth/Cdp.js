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
    const transaction = new TransactionObject(
      this._service.shutCdp(this._id),
      this._ethersProvider
    );

    return transaction;
  }

  getInfo() {
    return this._service.getCdpInfo(this._id);
  }
}
