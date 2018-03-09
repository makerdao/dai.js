import PrivateService from '../services/PrivateService';

export default class BaseWalletService extends PrivateService {
  accounts() {
    return new Promise((resolve, reject) => {
      reject('Inheriting classes must override accounts');
    });
  }

  balance(currency) {
    return this.accounts()
      .then(accounts => Promise.all(accounts.map(a => a.balance(currency))))
      .then(balances => Promise.resolve(balances.reduce((a,b) => a.plus(b))));
  }

  createAccount() {
  }
}
