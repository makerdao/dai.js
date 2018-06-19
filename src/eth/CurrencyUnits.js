import Validator from '../utils/Validator';

export default class Currency extends Validator{
  static create(amount, unit) {
    if (unit === ETH) {
      return ETH(amount)
    }
    if (unit === WETH) {
      return WETH(amount)
    }
    if (unit === PETH) {
      return PETH(amount)
    }
    if (unit === DAI) {
      return DAI(amount)
    }
    if (unit === MKR) {
      return MKR(amount)
    }
  }
  
  constructor(amount) {
    this._amount = Validator.amountToBigNumber(amount);
    this._unitLabel = 'undefined'
  }
  
  toString() {
    return `${this._amount} ${this._unitLabel}`
  }
}

class ETHClass extends Currency {
  constructor(amount) {
    super(amount)
    this._unitLabel = 'eth'
  }
}

// This wraps so we can use short syntax, e.g. ETH(6),
// since you can't define a class and then call it without `new`
function ETH(amount) {
  return new ETHClass(amount)
}

function getCurrency(amount, unit) {
  if (amount instanceof Currency) return amount
  return Currency.create(amount, unit)
}

// this is what lockEth, etc. might look like
function example(amount, unit=ETH) {
  const value = getCurrency(amount, unit)
  console.log(value.toString())
}