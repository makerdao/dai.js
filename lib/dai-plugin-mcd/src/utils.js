import assert from 'assert';

export function stringToBytes(str) {
  assert(!!str, 'argument is falsy');
  assert(typeof str === 'string', 'argument is not a string');
  return '0x' + Buffer.from(str).toString('hex');
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
