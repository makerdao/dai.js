import Validator from '../utils/Validator';
import BigNumber from 'bignumber.js';
import { WEI } from '../utils/constants';

export class Currency {
  constructor(amount) {
    this._amount = Validator.amountToBigNumber(amount);
    this.symbol = '???';
  }

  toString(decimals = 2) {
    return `${this._amount.toFixed(decimals)} ${this.symbol}`;
  }

  toBigNumber() {
    return this._amount;
  }

  toNumber() {
    return this._amount.toNumber();
  }
}

const symbols = ['DAI', 'ETH', 'WETH', 'PETH', 'MKR'];

const currencies = symbols.reduce((output, symbol) => {
  class CurrencyX extends Currency {
    constructor(amount) {
      super(amount);
      this.symbol = symbol;
    }
  }

  // This wraps so we can use short syntax, e.g. ETH(6),
  // since you can't define a class and then call it without `new`
  function makeCurrencyX(amount) {
    return new CurrencyX(amount);
  }
  makeCurrencyX.symbol = symbol;

  output[symbol] = makeCurrencyX;
  return output;
}, {});

const functions = {
  convert(amount, unit, divisor = WEI) {
    const shifted = new BigNumber(amount).dividedBy(divisor).toNumber();
    return functions.getCurrency(shifted, unit);
  },

  getCurrency(amount, unit) {
    if (amount instanceof Currency) return amount;
    if (!unit) throw new Error('Unit not specified');
    const key = typeof unit === 'string' ? unit.toUpperCase() : unit.symbol;
    return currencies[key](amount);
  },

  toNumber(amount) {
    if (Validator.isString(amount)) {
      return Validator.stringToNumber(amount);
    } else if (Validator.isNumber(amount)) {
      return amount;
    } else {
      return new Error('unrecognized type of amount');
    }
  },

  toBigNumber(amount) {
    if (Validator.isString(amount)) {
      return Validator.stringToBigNumber(amount);
    } else if (Validator.isNumber(amount)) {
      return Validator.amountToBigNumber(amount);
    } else {
      return new Error('unrecognized type of amount');
    }
  }
};

export default Object.assign({}, currencies, functions);
