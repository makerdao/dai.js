import { utils } from 'ethers';
import { currencies, getCurrency } from '../CurrencyUnits';

export default class Erc20Token {
  constructor(
    contract,
    web3Service,
    decimals = 18,
    transactionManager,
    symbol
  ) {
    this._contract = contract;
    this._web3Service = web3Service;
    this._decimals = decimals;
    this._transactionManager = transactionManager;
    this.symbol = symbol;
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

  // TODO replace all uses of this with Currency methods
  toUserFormat(value) {
    return utils.formatUnits(value, this._decimals);
  }

  // TODO replace all uses of this with valueForContract
  toEthereumFormat(value) {
    return utils.parseUnits(value.toString(), this._decimals);
  }

  valueForContract(value, unit) {
    return getCurrency(value, unit).toEthersBigNumber(this._decimals);
  }

  approve(spender, value, unit = currencies[this.symbol]) {
    return this._transact(
      'approve',
      spender,
      this.valueForContract(value, unit)
    );
  }

  approveUnlimited(spender) {
    return this._transact('approve', spender, -1);
  }

  transfer(to, value, unit = currencies[this.symbol]) {
    return this._transact('transfer', to, this.valueForContract(value, unit));
  }

  transferFrom(from, to, value, unit = currencies[this.symbol]) {
    return this._transact(
      'transferFrom',
      from,
      to,
      this.valueForContract(value, unit)
    );
  }

  totalSupply() {
    return this._contract.totalSupply().then(_ => this.toUserFormat(_));
  }

  _transact(method, ...args) {
    return this._transactionManager.createTransactionHybrid(
      this._contract[method](...args)
    );
  }
}
