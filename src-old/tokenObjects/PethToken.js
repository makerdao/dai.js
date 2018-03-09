import SmartContractService from '../services/SmartContractService';
import ERC20Token from './ERC20Token';

export default class PethToken extends ERC20Token {

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