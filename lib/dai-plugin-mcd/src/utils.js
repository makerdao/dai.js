import assert from 'assert';
const {
  utils: { stringToBytes32 }
} = require('@makerdao/dai');

export function getIlkForCurrency(currency, convertToBytes = true) {
  const ilk = currency.symbol;
  // TODO ilk = currency.symbol might not always be true;
  // may have to have a switch statement here with hardcoded values

  assert(ilk, "ilk can't be blank");
  return convertToBytes ? stringToBytes32(ilk, false) : ilk;
}

export function getSpotContractNameForCurrency(currency) {
  return 'MCD_SPOT_' + currency.symbol;
}

export function getPipContractNameForCurrency(currency) {
  return 'PIP_' + currency.symbol;
}

export function getFlipContractNameForCurrency(currency) {
  return 'MCD_FLIP_' + currency.symbol;
}

export function castAsCurrency(value, currency) {
  if (currency.isInstance(value)) return value;
  if (typeof value === 'string' || typeof value === 'number')
    return currency(value);

  throw new Error(`Can't cast ${value} as ${currency.symbol}`);
}
