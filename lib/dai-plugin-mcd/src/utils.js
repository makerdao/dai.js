import assert from 'assert';
const {
  utils: { stringToBytes32 }
} = require('@makerdao/dai');

export function getIlkForCurrency(currency, convertToBytes = true) {
  const ilk = currency.symbol;
  // TODO this might not always be true
  assert(ilk, "ilk can't be blank");
  return convertToBytes ? stringToBytes32(ilk, false) : ilk;
}
