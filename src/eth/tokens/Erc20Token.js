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
    this._currency = currencies[symbol];
  }

  async allowance(tokenOwner, spender) {
    return this._valueFromContract(
      await this._contract.allowance(tokenOwner, spender)
    );
  }

  async balanceOf(owner) {
    return this._valueFromContract(await this._contract.balanceOf(owner));
  }

  async totalSupply() {
    return this._valueFromContract(await this._contract.totalSupply());
  }

  address() {
    return this._contract.getAddress();
  }

  _valueForContract(value, unit = this._currency) {
    return getCurrency(value, unit).toEthersBigNumber(this._decimals);
  }

  _valueFromContract(value) {
    return this._currency(value, -1 * this._decimals);
  }

  approve(spender, value, unit = this._currency) {
    return this._transact(
      'approve',
      spender,
      this._valueForContract(value, unit)
    );
  }

  approveUnlimited(spender) {
    return this._transact('approve', spender, -1);
  }

  transfer(to, value, unit = currencies[this.symbol]) {
    return this._transact('transfer', to, this._valueForContract(value, unit));
  }

  transferFrom(from, to, value, unit = currencies[this.symbol]) {
    return this._transact(
      'transferFrom',
      from,
      to,
      this._valueForContract(value, unit)
    );
  }

  _transact(method, ...args) {
    return this._transactionManager.createTransactionHybrid(
      this._contract[method](...args)
    );
  }
}
