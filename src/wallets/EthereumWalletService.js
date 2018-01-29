import BaseWalletService from './BaseWalletService';

export default class EthereumWalletService extends BaseWalletService {
  constructor(name='EthereumWallet') {
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

  getAccounts() {
    return this.get('web3').getAccounts();
  }

  balance(currency) {
    return this.accounts()
      .then(accounts => Promise.all(accounts.map(a => a.balance(currency))))
      .then(balances => Promise.resolve(balances.reduce((a,b) => a.plus(b))));
  }
}
