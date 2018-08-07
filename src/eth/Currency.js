import tokens from '../../contracts/tokens';
import values from 'lodash.values';
import { utils } from 'ethers';
const { bigNumberify } = utils;
import BigNumber from 'bignumber.js';

function amountToBigNumber(amount) {
  const value = BigNumber(amount);
  if (value.lt(0)) throw new Error('amount cannot be negative');
  return value;
}

export class Currency {
  constructor(amount, shift = 0) {
    if (shift === 'wei') shift = -18;
    if (shift === 'ray') shift = -27;
    this._amount = shift
      ? amountToBigNumber(amount).shiftedBy(shift)
      : amountToBigNumber(amount);
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

    // always round down so that we never attempt to spend more than we have
    const val = this._amount
      .shiftedBy(shift)
      .integerValue(BigNumber.ROUND_DOWN)
      .toFixed();

    try {
      return bigNumberify(val);
    } catch (err) {
      throw new Error(`couldn't bigNumberify ${val}`);
    }
  }

  isSameType(other) {
    return this.symbol === other.symbol;
  }
}

const mathFunctions = [
  ['plus'],
  ['minus'],
  ['times', 'multipliedBy'],
  ['div', 'dividedBy'],
  ['shiftedBy']
];

const booleanFunctions = [
  ['isLessThan', 'lt'],
  ['isLessThanOrEqualTo', 'lte'],
  ['isGreaterThan', 'gt'],
  ['isGreaterThanOrEqualTo', 'gte']
];

function assertValidOperation(method, left, right) {
  const message = `Invalid operation: ${left.symbol} ${method} ${right.symbol}`;

  if (right instanceof CurrencyRatio) {
    // only supporting Currency as a left operand for now, though we could
    // extend this to support ratio-ratio math if needed
    switch (method) {
      case 'times':
        if (left.isSameType(right.denominator)) return;
        break;
      case 'div':
        if (left.isSameType(right.numerator)) return;
        break;
    }

    throw new Error(message);
  }

  if (right instanceof Currency && !left.isSameType(right)) {
    throw new Error(message);
  }
}

function result(method, left, right, value) {
  if (right instanceof CurrencyRatio) {
    switch (method) {
      case 'times':
        return right.numerator(value);
      case 'div':
        return right.denominator(value);
    }
  }
  return new left.constructor(value);
}

function bigNumberFnWrapper(method, isBoolean) {
  return function(other) {
    assertValidOperation(method, this, other);

    const otherBigNumber =
      other instanceof Currency ? other.toBigNumber() : other;

    const value = this.toBigNumber()[method](otherBigNumber);
    return isBoolean ? value : result(method, this, other, value);
  };
}

Object.assign(
  Currency.prototype,
  mathFunctions.reduce((output, [method, ...aliases]) => {
    output[method] = bigNumberFnWrapper(method);
    for (let alias of aliases) {
      output[alias] = output[method];
    }
    return output;
  }, {}),
  booleanFunctions.reduce((output, [method, ...aliases]) => {
    output[method] = bigNumberFnWrapper(method, true);
    for (let alias of aliases) {
      output[alias] = output[method];
    }
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

export const currencies = values(tokens).reduce(
  (output, symbol) => {
    output[symbol] = setupWrapper(symbol);
    return output;
  },
  {
    USD: setupWrapper('USD')
  }
);

// we export both the currencies object above and the individual currencies
// below because the latter is convenient when you know what you want to use,
// and the former is convenient when you are picking a currency based on a
// symbol from input

export const DAI = currencies.DAI;
export const ETH = currencies.ETH;
export const MKR = currencies.MKR;
export const PETH = currencies.PETH;
export const WETH = currencies.WETH;
export const USD = currencies.USD;

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

export class CurrencyRatio extends Currency {
  constructor(amount, numerator, denominator) {
    super(amount);
    this.numerator = numerator;
    this.denominator = denominator;
    this.symbol = `${numerator.symbol}/${denominator.symbol}`;
  }
}
