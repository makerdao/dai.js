import SmartContractService from '../services/SmartContractService';


export default class ERC20Token {

  constructor(contract) {
    this._contract = contract;
  }

  allowance(tokenOwner, spender){ //returns a promise
    return this._contract.allowance(tokenOwner, spender);
  }

  balanceOf(owner){
    return this._contract.balanceOf(owner);
  }

  approve(spender, value){
    return this._contract.approve(spender, value);
  }

  approveUnlimited(spender){
    return this._contract.approve(spender, -1);
  }

  transfer(from, to, value){
    return this._contract.transfer(from, to, value);
  }
}