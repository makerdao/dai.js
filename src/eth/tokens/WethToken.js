import Erc20Token from './Erc20Token';

export default class WethToken extends Erc20Token {
  constructor(contract, web3Service, decimals, transactionManager) {
    super(contract, web3Service, decimals, transactionManager);
    this._transactionManager = transactionManager;
  }

  name() {
    return this._contract.name();
  }

  symbol() {
    return this._contract.symbol();
  }

  deposit(amount) {
    const valueInWei = this.toEthereumFormat(amount);

    return this._transactionManager.createTransactionHybrid(
      this._contract.deposit({
        value: valueInWei
      })
    );
  }

  withdraw(amount) {
    const valueInWei = this.toEthereumFormat(amount);

    return this._transactionManager.createTransactionHybrid(
      this._contract.withdraw(valueInWei)
    );
  }
}
