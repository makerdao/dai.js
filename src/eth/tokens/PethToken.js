import TransactionObject from '../TransactionObject';
import Erc20Token from './Erc20Token';

export default class PethToken extends Erc20Token {
  constructor(contract, tub, ethersProvider) {
    super(contract);
    this._tub = tub;
    this._ethersProvider = ethersProvider;
  }

  join(amount) {
    const valueInWei = this.toEthereumFormat(amount);

    return new TransactionObject(
      this._tub.join(valueInWei, { gasLimit: 200000 }),
      this._ethersProvider
    );
  }

  exit(amount) {
    const valueInWei = this.toEthereumFormat(amount);

    return new TransactionObject(
      this._tub.exit(valueInWei, { gasLimit: 100000 }),
      this._ethersProvider
    );
  }
}
