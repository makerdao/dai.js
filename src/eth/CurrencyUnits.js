import Validator from '../utils/Validator';
import enums from '../../contracts/tokens';
import values from 'lodash.values';
import { utils } from 'ethers';
const { bigNumberify } = utils;

export class Currency {
  constructor(amount, shift = 0) {
    let number = Validator.amountToBigNumber(amount);
    if (shift === 'wei') shift = -18;
    if (shift === 'ray') shift = -27;
    this._amount = shift ? number.shiftedBy(shift) : number;
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

  toEthersBigNumber(shift = 0) {
    if (shift === 'wei') shift = 18;
    if (shift === 'ray') shift = 27;
    return bigNumberify(this._amount.shiftedBy(shift).toFixed());
  }

  isSameType(other) {
    return this.symbol === other.symbol;
  }
}

const mathFunctions = [
  'plus',
  'minus',
  'times',
  'multipliedBy',
  'div',
  'dividedBy'
];

const booleanFunctions = [
  'isLessThan',
  'lt',
  'isLessThanOrEqualTo',
  'lte',
  'isGreaterThan',
  'gt',
  'isGreaterThanOrEqualTo',
  'gte'
];

function bigNumberFnWrapper(method, isBoolean) {
  return function(other) {
    if (other instanceof Currency && !this.isSameType(other)) {
      throw new Error(
        `Mismatched currency types: ${this.symbol}, ${other.symbol}`
      );
    }

    const otherBigNumber =
      other instanceof Currency ? other.toBigNumber() : other;

    const value = this.toBigNumber()[method](otherBigNumber);
    return isBoolean ? value : this.constructor(value);
  };
}

Object.assign(
  Currency.prototype,
  mathFunctions.reduce((output, method) => {
    output[method] = bigNumberFnWrapper(method);
    return output;
  }, {}),
  booleanFunctions.reduce((output, method) => {
    output[method] = bigNumberFnWrapper(method, true);
    return output;
  }, {})
);

function setupWrapper(symbol) {
  class CurrencyX extends Currency {
    constructor(amount, shift) {
      super(amount, shift);
      this.symbol = symbol;
    }
  }

  // this changes the name of the class in stack traces
  Object.defineProperty(CurrencyX, 'name', { value: symbol });

  // This provides short syntax, e.g. ETH(6). We need a wrapper function because
  // you can't call an ES6 class consructor without `new`
  const creatorFn = (amount, shift) => new CurrencyX(amount, shift);

  const makeCreatorFnWithShift = shift => {
    const fn = amount => creatorFn(amount, shift);
    // these two properties are used by getCurrency
    fn.symbol = symbol;
    fn.shift = shift;
    return fn;
  };

  Object.assign(creatorFn, {
    wei: makeCreatorFnWithShift('wei'),
    ray: makeCreatorFnWithShift('ray'),
    symbol
  });

  return creatorFn;
}

export const currencies = values(enums).reduce((output, symbol) => {
  output[symbol] = setupWrapper(symbol);
  return output;
}, {});

// we export both the currencies object above and the individual currencies
// below because the latter is convenient when you know what you want to use,
// and the former is convenient when you are picking a currency based on a
// symbol from input

export const DAI = currencies.DAI;
export const ETH = currencies.ETH;
export const MKR = currencies.MKR;
export const PETH = currencies.PETH;
export const WETH = currencies.WETH;

export function getCurrency(amount, unit) {
  if (amount instanceof Currency) return amount;
  if (!unit) throw new Error('Unit not specified');
  const key = typeof unit === 'string' ? unit.toUpperCase() : unit.symbol;
  const ctor = currencies[key];
  if (!ctor) {
    throw new Error(`Couldn't find currency for "${key}"`);
  }
  return ctor(amount, unit.shift);
}
