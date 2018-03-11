import Erc20Token from './Erc20Token';

export default class WethToken extends Erc20Token {

  constructor(contract) {
  	super(contract);
  }

  deposit(amount){
    return this._contract.deposit({
      value: amount
    });
  }
    
  withdraw(amount){
    return this._contract.withdraw(amount);
  }
}