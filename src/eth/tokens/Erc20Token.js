import TransactionObject from '../TransactionObject';

export default class Erc20Token {

  constructor(contract, ethersProvider) {
    this._contract = contract;
    this._ethersProvider = ethersProvider;
  }

  allowance(tokenOwner, spender){
    return this._contract.allowance(tokenOwner, spender).then(_ => _[0]);
  }

  balanceOf(owner){
    return this._contract.balanceOf(owner).then(_ => _[0]);
  }

  address(){
    return this._contract.address;
  }

  approve(spender, value){
    //return this._contract.approve(spender, value);
    return new TransactionObject(this._contract.approve(spender, value), this._ethersProvider);
  }

  approveUnlimited(spender){
    return this._contract.approve(spender, -1);
  }

  transferFromSigner(to, value){
    return this._contract.transfer(to, value);
  }

  transfer(from, to, value){
    return this._contract.transferFrom(from, to, value);
  }

  totalSupply(){
    return this._contract.totalSupply().then(_ => _[0]);
  }
}