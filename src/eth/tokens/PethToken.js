import TransactionObject from '../TransactionObject';

import Erc20Token from './Erc20Token';

export default class PethToken extends Erc20Token {
  constructor(contract, tub, ethersProvider) {
    super(contract);
    this._tub = tub;
    this._ethersProvider = ethersProvider;
  }

  join(amount) {
    return new TransactionObject(
      this._tub.join(amount, { gasLimit: 200000 }),
      this._ethersProvider
    );
  }

  exit(amount) {
    return new TransactionObject(
      this._tub.exit(amount, { gasLimit: 100000 }),
      this._ethersProvider
    );
  }
}
