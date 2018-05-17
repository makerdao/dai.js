import Erc20Token from './Erc20Token';

export default class PethToken extends Erc20Token {
  constructor(contract, tub, web3Service, decimals, transactionManager) {
    super(contract, web3Service, decimals, transactionManager);
    this._tub = tub;
    this._web3Service = web3Service;
    this._transactionManager = transactionManager;
  }

  join(amount) {
    const valueInWei = this.toEthereumFormat(amount);

    return this._transactionManager.createTransactionHybrid(
      this._tub.join(valueInWei, { gasLimit: 200000 })
    );
  }

  exit(amount) {
    const valueInWei = this.toEthereumFormat(amount);

    return this._transactionManager.createTransactionHybrid(
      this._tub.exit(valueInWei, { gasLimit: 100000 })
    );
  }

  per() {
    return this._tub.per().then(ratio => parseFloat(this.toUserFormat(ratio)));
  }

  ask(amount) {
    const valueInWei = this.toEthereumFormat(amount);

    return this._tub
      .ask(valueInWei)
      .then(value => parseFloat(this.toUserFormat(value)));
  }
}
