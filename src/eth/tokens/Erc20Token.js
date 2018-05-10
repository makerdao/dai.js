import { utils } from 'ethers';

export default class Erc20Token {
  constructor(contract, web3Service, decimals = 18, transactionManager) {
    this._contract = contract;
    this._web3Service = web3Service;
    this._decimals = decimals;
    this._transactionManager = transactionManager;
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
    return this._contract.getAddress();
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
    return this._transactionManager.createTransactionHybrid(
      this._contract.approve(spender, valueInWei)
    );
  }

  approveUnlimited(spender) {
    return this._transactionManager.createTransactionHybrid(
      this._contract.approve(spender, -1)
    );
  }

  transfer(to, value) {
    const valueInWei = this.toEthereumFormat(value);
    return this._transactionManager.createTransactionHybrid(
      this._contract.transfer(to, valueInWei)
    );
  }

  transferFrom(from, to, value) {
    const valueInWei = this.toEthereumFormat(value);
    return this._transactionManager.createTransactionHybrid(
      this._contract.transferFrom(from, to, valueInWei)
    );
  }

  totalSupply() {
    return this._contract.totalSupply().then(_ => this.toUserFormat(_));
  }
}
