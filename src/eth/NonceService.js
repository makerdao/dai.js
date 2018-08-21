import PublicService from '../core/PublicService';

export default class NonceService extends PublicService {
  constructor(name = 'nonce') {
    super(name, ['web3']);
  }

  inject(args, nonce) {
    if (
      args.length === 1 &&
      typeof args[0] === 'object' &&
      !Object.keys(args[0]).includes('_bn')
    ) {
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

  getNonce() {
    return this.get('web3')._web3.eth.getTransactionCount(
      this.get('web3').defaultAccount()
    );
  }
}
