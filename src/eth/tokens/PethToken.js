import Erc20Token from './Erc20Token';

export default class PethToken extends Erc20Token {

  constructor(contract, web3Service, gasEstimatorService, tub) {
  	super(contract, web3Service, gasEstimatorService);
    this._tub = tub;
  }

  join(amount){
    return this._tub.join(amount);
  }

  exit(amount){
    return this._tub.exit(amount);
  }

}