import SmartContractService from '../services/SmartContractService';

export default class WethToken extends ERC20Token {

  constructor(contract) {
    this._contract = contract;
  }

  deposit(amount){
    return this._contract.deposit({value: amount}); //ethersJS has an optional additional parameter that is overrideOptions
  }
    
  withdraw(amount){
    return this._contract.withdraw(amount);
  }
}