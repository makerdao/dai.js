import Erc20Token from './Erc20Token';

export default class WethToken extends Erc20Token {
  constructor(contract) {
    super(contract);
  }

  name() {
    return this._contract.name().then(n => n[0]);
  }

  symbol() {
    return this._contract.symbol().then(s => s[0]);
  }

  deposit(amount) {
    return this._contract.deposit({
      value: amount
    });
  }

  withdraw(amount) {
    return this._contract.withdraw(amount);
  }
}
