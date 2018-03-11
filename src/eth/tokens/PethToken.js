import Erc20Token from './Erc20Token';

export default class PethToken extends Erc20Token {

  constructor(contract, tub) {
  	super(contract);
    this._tub = tub;
  }

  join(amount){
    return this._tub.join(amount, { gasLimit: 100000 });
  }

  exit(amount){
    return this._tub.exit(amount);
  }
}