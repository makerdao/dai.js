import Validator from '../utils/Validator';
import { WEI, RAY } from '../utils/constants';
import enums from '../../contracts/tokens';
import values from 'lodash.values';
import { utils } from 'ethers';
const { bigNumberify } = utils;

export class Currency {
  constructor(amount, divisor) {
    let number = Validator.amountToBigNumber(amount);
    this._amount = divisor ? number.dividedBy(divisor) : number;
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
    return bigNumberify(this._amount.shiftedBy(shift).toFixed());
  }
}

export const currencies = values(enums).reduce((output, symbol) => {
  class CurrencyX extends Currency {
    constructor(amount, divisor) {
      super(amount, divisor);
      this.symbol = symbol;
    }
  }

  // this changes the name of the class in stack traces
  Object.defineProperty(CurrencyX, 'name', { value: symbol });

  // This provides short syntax, e.g. ETH(6). We need a wrapper function because
  // you can't call an ES6 class consructor without `new`
  const creator = amount => new CurrencyX(amount);
  creator.fromWei = amount => new CurrencyX(amount, WEI);
  creator.fromRay = amount => new CurrencyX(amount, RAY);
  creator.symbol = symbol;

  output[symbol] = creator;
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
    throw new Error(`Couldn't find currency for "${key}" (${unit})`);
  }
  return ctor(amount);
}
