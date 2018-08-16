import PublicService from '../core/PublicService';

export default class NonceService extends PublicService {
  constructor(name = 'nonce') {
    super(name, ['web3']);
  }

  async setInitialTransactionCount() {
    const web3 = this.get('web3');
    const address = web3.defaultAccount();
    const count = await web3._web3.eth.getTransactionCount(address);

    this._transactionCount = count;
  }

  getNewNonce() {
    this._transactionCount += 1;
    return this._transactionCount;
  }
}
