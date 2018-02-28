import BaseWalletService from './BaseWalletService';

export default class EthereumWalletService extends BaseWalletService {
  constructor(name='ethereumWallet') {
    super(name, ['log', 'web3']);

    // Pass through personal web3 service methods.
    const methods = [ 'lockAccount', 'newAccount', 'unlockAccount' ];
    for (let method of methods) {
      this[method] = function () {
        let personal = this.get('web3').personal;
        personal[method].apply(personal, arguments);
      };
    }
  }

  getDefaultAccount() {
    const defaultAccountAddress = this._defaultAccountAddress;
    return {
      getAllowance: (symbol) => this.getAllowance(defaultAccountAddress, symbol),
      getBalance: (symbol) => this.getBalance(defaultAccountAddress, symbol)
    };
  }

  getAllowance(account, symbol) {
    return this.get('token').getToken(symbol).getAllowance(account);
  }
  
  getBalance(account, symbol) {
    return this.get('token').getToken(symbol).getBalance(account);
  }

  getTokens(){
    // will be a set list of Tokens
  }
}