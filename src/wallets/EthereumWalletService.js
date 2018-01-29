import BaseWalletService from './BaseWalletService';
import promisifyAsync from '../Utils';

export default class EthereumWalletService extends BaseWalletService {
  constructor(name='EthereumWallet') {
    super(name, ['log', 'web3']);

    let web3 = this.get('web3');
    const methods = [ 'lockAccount', 'newAccount', 'unlockAccount' ];

    for (let method of methods) {
      this[method] = promisifyAsync.call(web3.personal, web3.personal[method]);
    }
  }

  accounts() {
    return this.get('web3').accounts();
  }

  balance(currency) {
    return this.accounts()
      .then(accounts => Promise.all(accounts.map(a => a.balance(currency))))
      .then(balances => Promise.resolve(balances.reduce((a,b) => a.plus(b))));
  }
}
