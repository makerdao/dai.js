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
    const valueInWei = this.toEthereumFormat(amount);
    return new TransactionObject(
      this._contract.deposit({
        value: valueInWei
      }),
      this._ethersProvider
    );
  }

  withdraw(amount) {
    const valueInWei = this.toEthereumFormat(amount);
    return new TransactionObject(
      this._contract.withdraw(valueInWei),
      this._ethersProvider
    );
  }
}
