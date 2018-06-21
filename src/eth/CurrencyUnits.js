import Validator from '../utils/Validator';

export default class Currency extends Validator{
  static create(amount, unit) {
    if (unit === ETH) {
      return ETH(amount);
    }
    if (unit === WETH) {
      return WETH(amount);
    }
    if (unit === PETH) {
      return PETH(amount);
    }
    if (unit === DAI) {
      return DAI(amount);
    }
    if (unit === MKR) {
      return MKR(amount);
    }
  }
  
  constructor(amount) {
    super(amount);
    this._amount = Validator.amountToBigNumber(amount);
    this._unitLabel = 'undefined';
  }
  
  static toString() {
    return `${this._amount} ${this._unitLabel}`;
  }

  static getCurrency(amount, unit) {
    if (amount instanceof Currency) return amount
    return Currency.create(amount, unit)
  }

  static toNumber(amount){
    if (Validator.isString(amount)) {
      return Validator.stringToNumber(amount);
    } else if (Validator.isNumber(amount)) {
      return amount
    } else {
      return new Error("unrecognized type of amount")
    }
  }

  static toBigNumber(amount){
    if (Validator.isString(amount)) {
      return Validator.stringToBigNumber(amount);
    } else if (Validator.isNumber(amount)) {
      return Validator.amountToBigNumber(amount);
    } else {
      return new Error("unrecognized type of amount")
    }
  }
}

class ETHClass extends Currency {
  constructor(amount) {
    super(amount);
    this._unitLabel = 'eth';
  }
}

// This wraps so we can use short syntax, e.g. ETH(6),
// since you can't define a class and then call it without `new`
function ETH(amount) {
  return new ETHClass(amount);
}

class WETHClass extends Currency {
  constructor(amount) {
    super(amount);
    this._unitLabel = 'weth';
  }
}

//need to use reflection for this?
function WETH(amount) {
  return new WETHClass(amount);
}

