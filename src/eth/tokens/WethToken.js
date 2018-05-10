import TransactionObject from '../TransactionObject';
import Erc20Token from './Erc20Token';

export default class WethToken extends Erc20Token {
  constructor(contract, web3Service, decimals, transactionManager) {
    super(contract, web3Service, decimals, transactionManager);
  }

  name() {
    return this._contract.name();
  }

  symbol() {
    return this._contract.symbol();
  }

  deposit(amount) {
    const valueInWei = this.toEthereumFormat(amount);

    return new TransactionObject(
      this._contract.deposit({
        value: valueInWei
      }),
      this._web3Service
    );
  }

  withdraw(amount) {
    const valueInWei = this.toEthereumFormat(amount);

    return new TransactionObject(
      this._contract.withdraw(valueInWei),
      this._web3Service
    );
  }
}
