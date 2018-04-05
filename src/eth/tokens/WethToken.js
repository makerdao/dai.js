import TransactionObject from '../TransactionObject';

import Erc20Token from './Erc20Token';

export default class WethToken extends Erc20Token {
  constructor(contract, ethersProvider) {
    super(contract, ethersProvider);
  }

  name() {
    return this._contract.name().then(n => n[0]);
  }

  symbol() {
    return this._contract.symbol().then(s => s[0]);
  }

  deposit(amount) {
    return new TransactionObject(
      this._contract.deposit({
        value: amount
      }),
      this._ethersProvider
    );
  }

  withdraw(amount) {
    return new TransactionObject(
      this._contract.withdraw(amount),
      this._ethersProvider
    );
  }
}
