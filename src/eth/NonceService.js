import PublicService from '../core/PublicService';

export default class NonceService extends PublicService {
  constructor(name = 'nonce') {
    super(name, ['web3']);
  }

  _getTxCount() {
    return this.get('web3')._web3.eth.getTransactionCount(
      this.get('web3').defaultAccount(),
      'pending'
    );
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

  async setNextNonce() {
    this._nextNonce = await this._getTxCount();
  }

  async getNonce() {
    // await this._nextNonce;
    const txCount = await this._getTxCount();
    let nonce;
    if (this._nextNonce) {
      txCount > this._nextNonce ? (nonce = txCount) : (nonce = this._nextNonce);
      this._nextNonce += 1;
    } else {
      console.warn('NonceService transaction count is undefined.');
      nonce = txCount;
    }

    return nonce;
  }
}
