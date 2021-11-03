import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import { currencies, getCurrency } from '../Currency';
import { UINT256_MAX } from '../../utils/constants';

// const maxAllowance = BigNumber(UINT256_MAX).shiftedBy(-18);
const maxAllowance = BigNumber(2000000000000000000);

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
    return this._currency(value.toString(), -1 * this._decimals);
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
    const WAD = new BigNumber('1e18');
    // const MAX_UINT = 2 ** 256 - 1;
    // const amt = this._valueForContract(500, this._currency);
    // const amt = new BigNumber(500);
    // const amt = 500000000000000000000;

    // const amt = '0x1b1ae4d6e2ef500000';
    // const amt = new BigNumber(500).times(WAD);
    const amt = new BigNumber(500).times(WAD).toString();
    // 50000000000000000000000000
    if (!spender) spender = this._web3.currentAddress();
    return this._contract.approve(spender, amt, {
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

  transferFrom(from, to, value, { unit = this._currency, promise } = {}) {
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
