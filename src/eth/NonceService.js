import PublicService from '../core/PublicService';
import { promisify } from '../utils';

export default class NonceService extends PublicService {
  constructor(name = 'nonce') {
    super(name, ['web3', 'accounts']);
    this._counts = {};
  }

  async connect() {
    this._accountsService = this.get('accounts');
    this._web3Service = this.get('web3');
    await this.setCounts();
  }

  async _getTxCount(address) {
    return promisify(this._web3Service._web3.eth.getTransactionCount)(
      address,
      'pending'
    );
  }

  _compareNonceCounts(txCount, address) {
    if (txCount > this._counts[address]) {
      return txCount;
    } else {
      return this._counts[address];
    }
  }

  async setCounts() {
    const accountsList = await this._accountsService.listAccounts();

    return new Promise(resolve => {
      accountsList.map(async account => {
        const txCount = await this._getTxCount(account.address);
        this._counts[account.address] = txCount;

        if (Object.keys(this._counts).length === accountsList.length) {
          resolve();
        }
      });
    });
  }

  async getNonce() {
    const address = this._web3Service.currentAccount();
    const txCount = await this._getTxCount(address);
    let nonce;

    if (this._counts[address]) {
      nonce = this._compareNonceCounts(txCount, address);
      this._counts[address] += 1;
    } else {
      this._counts[address] = txCount;
      nonce = txCount;
      this._counts[address] += 1;
    }

    return nonce;
  }
}
