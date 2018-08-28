import PublicService from '../core/PublicService';
import { promisify } from '../utils';

export default class NonceService extends PublicService {
  constructor(name = 'nonce') {
    super(name, ['web3']);
  }

  async connect() {
    await this.setNextNonce();
  }

  async _getTxCount() {
    const web3Service = this.get('web3');
    return promisify(web3Service._web3.eth.getTransactionCount)(
      web3Service.currentAccount(),
      'pending'
    );
  }

  _compareNonceCounts(txCount) {
    if (txCount > this._count) {
      return txCount;
    } else {
      return this._count;
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
      console.log('args in else:', args);
      args.push({ nonce: nonce });
    }
    return args;
  }

  async setNextNonce() {
    return (this._count = await this._getTxCount());
  }

  async getNonce() {
    const txCount = await this._getTxCount();
    let nonce;

    if (this._count) {
      nonce = this._compareNonceCounts(txCount);
      this._count += 1;
    } else {
      console.warn('NonceService transaction count is undefined.');
      nonce = txCount;
    }

    return nonce;
  }
}
