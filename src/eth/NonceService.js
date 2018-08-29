import PublicService from '../core/PublicService';
import { promisify } from '../utils';

export default class NonceService extends PublicService {
  constructor(name = 'nonce') {
    super(name, ['web3', 'accounts']);
    this._counts = {};
  }

  async connect() {
    await this.setCounts();
  }

  async _getTxCount(address) {
    const web3Service = this.get('web3');
    return promisify(web3Service._web3.eth.getTransactionCount)(
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

  async inject(args) {
    const nonce = await this.getNonce();

    if (
      typeof args[args.length - 1] === 'object' &&
      !Object.keys(args[args.length - 1]).includes('_bn')
    ) {
      args[args.length - 1]['nonce'] = nonce;
    } else {
      args.push({ nonce: nonce });
    }
    return args;
  }

  async setCounts() {
    const accountsList = await this.get('accounts').listAccounts();

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
    const address = this.get('web3').currentAccount();
    const txCount = await this._getTxCount(address);
    let nonce;

    if (this._counts[address]) {
      nonce = this._compareNonceCounts(txCount, address);
      this._counts[address] += 1;
    } else {
      console.warn('NonceService transaction count is undefined.');
      nonce = txCount;
    }

    return nonce;
  }
}
