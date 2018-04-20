import TransactionObject from '../TransactionObject';
import { utils } from 'ethers';

export default class Erc20Token {
  constructor(contract, ethersProvider, decimals = 18) {
    this._contract = contract;
    this._ethersProvider = ethersProvider;
    this._decimals = decimals;
  }

  allowance(tokenOwner, spender) {
    //needs to convert from wei to ether
    return this._contract
      .allowance(tokenOwner, spender)
      .then(_ => this.toUserFormat(_[0]));
  }

  balanceOf(owner) {
    return this._contract.balanceOf(owner).then(_ => this.toUserFormat(_[0]));
  }

  address() {
    return this._contract.address;
  }

  decimals() {
    return this._decimals;
  }

  //think of name ToDecimal?
  toUserFormat(value) {
    return utils.formatUnits(value, this._decimals);
  }
  toEthereumFormat(value) {
    return utils.parseUnits(value, this._decimals);
  }

  approve(spender, value) {
    const valueInWei = this.toEthereumFormat(value);
    return new TransactionObject(
      this._contract.approve(spender, valueInWei),
      this._ethersProvider
    );
  }

  approveUnlimited(spender) {
    return new TransactionObject(
      this._contract.approve(spender, -1),
      this._ethersProvider
    );
  }

  transfer(to, value) {
    const valueInWei = this.toEthereumFormat(value);
    return new TransactionObject(
      this._contract.transfer(to, valueInWei),
      this._ethersProvider
    );
  }

  transferFrom(from, to, value) {
    const valueInWei = this.toEthereumFormat(value);
    return new TransactionObject(
      this._contract.transferFrom(from, to, valueInWei),
      this._ethersProvider
    );
  }

  totalSupply() {
    return this._contract.totalSupply().then(_ => this.toUserFormat(_[0]));
  }
}
