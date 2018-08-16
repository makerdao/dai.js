import PublicService from '../core/PublicService';

export default class NonceService extends PublicService {
  constructor(name = 'nonce') {
    super(name, ['web3']);
    this._transactionCount = 0;
  }

  async setInitialNonce() {
    const web3 = this.get('web3');
    const address = this.get('web3').defaultAccount();
    // return web3.eth.getTransactionCount(address);
    return address;
  }

  async getNonce() {}

  setNonce() {}
}
