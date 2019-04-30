import { currencies, getCurrency } from '../Currency';

export default class Erc20Token {
  constructor(contract, web3Service, decimals = 18, symbol, currency) {
    this._contract = contract;
    this._web3 = web3Service;
    this._decimals = decimals;
    this.symbol = symbol;
    this._currency = currency || currencies[symbol];
  }

  async allowance(tokenOwner, spender) {
    return this._valueFromContract(
      await this._contract.allowance(tokenOwner, spender)
    );
  }

  async balance() {
    return this.balanceOf(this._web3.currentAddress());
  }

  async balanceOf(owner) {
    return this._valueFromContract(await this._contract.balanceOf(owner));
  }

  async totalSupply() {
    return this._valueFromContract(await this._contract.totalSupply());
  }

  address() {
    return this._contract.address;
  }

  _valueForContract(value, unit = this._currency) {
    return this._getCurrency(value, unit).toFixed(this._decimals);
  }

  _valueFromContract(value) {
    return this._currency(value, -1 * this._decimals);
  }

  approve(spender, value, { unit = this._currency, ...options } = {}) {
    return this._contract.approve(
      spender,
      this._valueForContract(value, unit),
      {
        metadata: {
          action: {
            name: 'approve',
            spender,
            allowance: this._getCurrency(value, unit),
            allowing: value != '0'
          }
        },
        ...options
      }
    );
  }

  approveUnlimited(spender, options = {}) {
    if (!spender) spender = this._web3.currentAddress();
    return this._contract.approve(spender, -1, {
      metadata: {
        action: {
          name: 'approve',
          spender,
          allowance: Number.MAX_SAFE_INTEGER,
          allowing: true,
          unlimited: true
        }
      },
      ...options
    });
  }

  transfer(to, value, { unit = this._currency, promise } = {}) {
    return this._contract.transfer(to, this._valueForContract(value, unit), {
      metadata: {
        action: {
          name: 'transfer',
          from: this._web3.currentAddress(),
          to,
          amount: this._getCurrency(value, unit)
        }
      },
      promise
    });
  }

  transferFrom(
    from,
    to,
    value,
    { unit = this._currency, promise } = {}
  ) {
    return this._contract.transferFrom(
      from,
      to,
      this._valueForContract(value, unit),
      {
        metadata: {
          action: {
            name: 'transfer',
            from,
            to,
            amount: getCurrency(value, unit)
          }
        },
        promise
      }
    );
  }

  _getCurrency(amount, unit) {
    if (unit == this._currency) return this._currency(amount);
    return getCurrency(amount, unit);
  }
}
