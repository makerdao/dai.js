import BigNumber from 'bignumber.js';
import { utils as ethersUtils } from 'ethers';

export function numberToBytes32(num) {
  const bn = ethersUtils.bigNumberify(num);
  return ethersUtils.hexlify(ethersUtils.padZeros(bn, 32));
}

export function bytes32ToNumber(bytes32) {
  return ethersUtils.bigNumberify(bytes32).toNumber();
}

export function stringToBytes32(text, pad = true) {
  var data = ethersUtils.toUtf8Bytes(text);
  if (data.length > 32) {
    throw new Error('too long');
  }
  if (pad) data = ethersUtils.padZeros(data, 32);
  return ethersUtils.hexlify(data);
}

export function padRight(string, chars, sign) {
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
  return BigNumber(value).shiftedBy(-18);
}

export function fromRay(value) {
  return BigNumber(value).shiftedBy(-27);
}

export function fromRad(value) {
  return BigNumber(value).shiftedBy(-45);
}
