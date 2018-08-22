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

  inject(args) {
    if (
      typeof args[args.length - 1] === 'object' &&
      !Object.keys(args[args.length - 1]).includes('_bn')
    ) {
      args[args.length - 1]['nonce'] = this.getNonce();
    } else {
      args.push({ nonce: this.getNonce() });
    }

    return args;
  }

  setNextNonce() {
    this._nextNonce = this._getTxCount();
  }

  getNonce() {
    // await this._nextNonce;
    const txCount = this._getTxCount();
    let nonce;

    txCount > this._nextNonce ? (nonce = txCount) : (nonce = this._nextNonce);
    this._nextNonce += 1;

    return nonce;
  }
}
