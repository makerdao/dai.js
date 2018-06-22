import Validator from '../utils/Validator';
import BigNumber from 'bignumber.js';
import { WEI } from '../utils/constants';
import enums from '../../contracts/tokens';
import values from 'lodash.values';

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

const currencies = values(enums).reduce((output, symbol) => {
  class CurrencyX extends Currency {
    constructor(amount) {
      super(amount);
      this.symbol = symbol;
    }
  }

  // this changes the name of the class in stack traces
  Object.defineProperty(CurrencyX, 'name', { value: symbol });

  // This wraps so we can use short syntax, e.g. ETH(6),
  // since you can't define a class and then call it without `new`
  output[symbol] = amount => new CurrencyX(amount);
  output[symbol].symbol = symbol;
  return output;
}, {});

const functions = {
  convert(amount, unit, divisor = WEI) {
    // allow passing in an integer to support arbitrary place-shifting. this is
    // somewhat overkill at the moment, but the number of decimals for a token
    // is parameterized (see e.g. the Erc20Token constructor) so if that is ever
    // a number other than 18 or 27, this code would have to follow suit.
    if (typeof divisor === 'number') {
      divisor = BigNumber('1e' + divisor);
    }
    const shifted = BigNumber(amount).dividedBy(divisor);
    return functions.getCurrency(shifted, unit);
  },

  getCurrency(amount, unit) {
    if (amount instanceof Currency) return amount;
    if (!unit) throw new Error('Unit not specified');
    const key = typeof unit === 'string' ? unit.toUpperCase() : unit.symbol;
    const ctor = currencies[key];
    if (!ctor) {
      throw new Error(`Couldn't find currency for "${key}" (${unit})`);
    }
    return ctor(amount);
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
