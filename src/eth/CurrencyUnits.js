import Validator from '../utils/Validator';
import BigNumber from 'bignumber.js';
import { WEI } from '../utils/constants';

export class Currency {
  constructor(amount) {
    this._amount = Validator.amountToBigNumber(amount);
    this.symbol = '???';
  }

  toString() {
    return `${this._amount.toFixed(2)} ${this.symbol}`;
  }

  toBigNumber() {
    return this._amount;
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
  convertWei(amount, unit) {
    const unwei = new BigNumber(amount).dividedBy(WEI).toNumber();
    return functions.getCurrency(unwei, unit);
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
