import PublicService from '../core/PublicService';

export default class NonceService extends PublicService {
  constructor(name = 'nonce') {
    super(name, ['web3']);
  }

  async setInitialTransactionCount() {
    const web3 = this.get('web3');
    const address = web3.defaultAccount();
    this._transactionCount =
      (await web3._web3.eth.getTransactionCount(address, 'pending')) + 1;
  }

  inject(args, nonce) {
    if (
      args.length === 1 &&
      typeof args[0] === 'object' &&
      !Object.keys(args[0]).includes('_bn')
    ) {
      console.log('inside first case');
      args[0]['nonce'] = nonce;
    } else if (
      typeof args[args.length - 1] === 'object' &&
      !Object.keys(args[args.length - 1]).includes('_bn')
    ) {
      args[args.length - 1]['nonce'] = nonce;
    } else {
      args.push({ nonce: nonce });
    }

    return args;
  }

  getNewNonce() {
    this._transactionCount += 1;
    return this._transactionCount;
  }
}
