import PublicService from '../core/PublicService';

export default class NonceService extends PublicService {
  constructor(name = 'nonce') {
    super(name, ['web3']);
  }

  async connect() {
    // await super.manager().connect();
    await this.setNextNonce();
  }

  async _getTxCount() {
    return await this.get('web3')._web3.eth.getTransactionCount(
      this.get('web3').defaultAccount(),
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
      args.push({ nonce: nonce });
    }

    return args;
  }

  async setNextNonce() {
    this._count = await this._getTxCount();
  }

  async getNonce() {
    const txCount = await this._getTxCount();
    let nonce;
    this._count += 1;

    if (this._count) {
      nonce = this._compareNonceCounts(txCount);
    } else {
      console.warn('NonceService transaction count is undefined.');
      nonce = txCount;
    }

    return nonce;
  }
}
