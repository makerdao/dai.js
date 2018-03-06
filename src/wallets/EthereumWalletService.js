import BaseWalletService from './BaseWalletService';

export default class EthereumWalletService extends BaseWalletService {
  constructor(name='ethereumWallet') {
    super(name, ['log', 'timer']);
  }

  getTokens(){
    // will be a set list of Tokens
  }
}