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
