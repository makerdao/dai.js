export default class Erc20Token {

  constructor(contract) {
    this._contract = contract;
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
    return this._contract.approve(spender, value);
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