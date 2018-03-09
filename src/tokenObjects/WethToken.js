import SmartContractService from '../services/SmartContractService';
import ERC20Token from './ERC20Token';

export default class WethToken extends ERC20Token {

  constructor(contract, web3Service, gasEstimatorService) {
  	super(contract, web3Service, gasEstimatorService);
  }

  deposit(amount){
  	console.log('about to deposit');
    return this._contract.deposit({value: amount}); //ethersJS has an optional additional parameter that is overrideOptions
  }
    
  withdraw(amount){
    return this._contract.withdraw(amount);
  }
}