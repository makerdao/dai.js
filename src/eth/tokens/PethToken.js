import TransactionObject from '../TransactionObject';
import Erc20Token from './Erc20Token';

export default class PethToken extends Erc20Token {
  constructor(contract, tub, web3Service, decimals) {
    super(contract, web3Service, decimals);
    this._tub = tub;
    this._web3Service = web3Service;
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
      this._web3Service
    );
  }
}
