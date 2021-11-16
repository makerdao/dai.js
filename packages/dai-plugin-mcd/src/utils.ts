import assert from 'assert';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';
import { Currency } from '@makerdao/currency';
import { defaultTokens } from './tokens';
import { utils as ethersUtils } from 'ethers';

const web3Utils = new Web3().utils;

export function hexZeroPad(srt, numBytes = 32) {
  return ethersUtils.hexZeroPad(srt, numBytes);
}

export function stringToBytes(str) {
  assert(!!str, 'argument is falsy');
  assert(typeof str === 'string', 'argument is not a string');
  return ethersUtils.formatBytes32String(str);
}

export function bytesToString(hex) {
  return Buffer.from(hex.replace(/^0x/, ''), 'hex')
    .toString()
    .replace(/\x00/g, ''); // eslint-disable-line no-control-regex
}

export function nullIfEmpty(value) {
  return value === '' ? null : value;
}

export function castAsCurrency(value, currency) {
  if (currency.isInstance(value)) return value;
  if (typeof value === 'string' || typeof value === 'number')
    return currency(value);

  throw new Error(`Can't cast ${value} as ${currency.symbol}`);
}

export function parseWeiNumeric(value, denom = 'ether') {
  // fromWei will throw if passing a Bignumber value or string value that results
  // in being an exponent representation of a number when parsed as a number, e.g 1e18.
  // Passing value as a hex value seems to get around this
  return web3Utils.fromWei(new BigNumber(value).toString(16), denom as any);
}

export function numberFromNumeric(value) {
  return new BigNumber(value).toNumber();
}

export function padRight(string, chars, sign?) {
  return string + new Array(chars - string.length + 1).join(sign ? sign : '0');
}

export function toHex(str, { with0x = true, rightPadding = 64 } = {}) {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }
  if (rightPadding > 0) result = padRight(result, rightPadding);
  return with0x ? '0x' + result : result;
}

export function fromWei(value) {
  return new BigNumber(value).shiftedBy(-18);
}

export function fromRay(value) {
  return new BigNumber(value).shiftedBy(-27);
}

export function fromRad(value) {
  return new BigNumber(value).shiftedBy(-45);
}

export function isBigNumber(value) {
  return BigNumber.isBigNumber(value);
}

export function isCurrency(value) {
  return value instanceof Currency;
}

export const isValidAddressString = addressString =>
  /^0x([A-Fa-f0-9]{40})$/.test(addressString);

export const getMcdToken = token =>
  defaultTokens.find(mcdToken => mcdToken.symbol === token);

export function promiseWait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// https://stackoverflow.com/a/43963612/56817
export const uniqueId = (() => {
  let currentId = 0;
  const map = new WeakMap();

  return object => {
    if (!map.has(object)) {
      map.set(object, ++currentId);
    }

    return map.get(object);
  };
})();
