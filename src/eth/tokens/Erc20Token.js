import TransactionObject from '../TransactionObject';
import { utils } from 'ethers';

export default class Erc20Token {
  constructor(contract, web3Service, decimals = 18) {
    this._contract = contract;
    this._web3Service = web3Service;
    this._decimals = decimals;
  }

  allowance(tokenOwner, spender) {
    return this._contract
      .allowance(tokenOwner, spender)
      .then(_ => this.toUserFormat(_));
  }

  balanceOf(owner) {
    return this._contract.balanceOf(owner).then(_ => this.toUserFormat(_));
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
      this._web3Service
    );
  }

  approveUnlimited(spender) {
    return new TransactionObject(
      this._contract.approve(spender, -1),
      this._web3Service
    );
  }

  transfer(to, value) {
    const valueInWei = this.toEthereumFormat(value);
    return new TransactionObject(
      this._contract.transfer(to, valueInWei),
      this._web3Service
    );
  }

  transferFrom(from, to, value) {
    const valueInWei = this.toEthereumFormat(value);
    return new TransactionObject(
      this._contract.transferFrom(from, to, valueInWei),
      this._web3Service
    );
  }

  totalSupply() {
    return this._contract.totalSupply().then(_ => this.toUserFormat(_));
  }
}
