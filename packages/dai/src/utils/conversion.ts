import BigNumber from 'bignumber.js';
import { utils as ethersUtils, BigNumber as EthersBigNumber } from 'ethers';
import assert from 'assert';

export function numberToBytes32(num) {
  const bn = EthersBigNumber.from(num);
  return ethersUtils.hexlify(ethersUtils.zeroPad(bn.toString(), 32));
}

export function bytes32ToNumber(bytes32) {
  return EthersBigNumber.from(bytes32).toNumber();
}

export function stringToBytes32(text, pad = true) {
  var data = ethersUtils.toUtf8Bytes(text);
  if (data.length > 32) {
    throw new Error('too long');
  }
  if (pad) {
    return ethersUtils.hexlify(ethersUtils.zeroPad(data, 32));
  }
  
  return ethersUtils.hexlify(data);
}

export function stringToBytes(str) {
  assert(!!str, 'argument is falsy');
  assert(typeof str === 'string', 'argument is not a string');
  return '0x' + Buffer.from(str).toString('hex');
}

export function bytesToString(hex) {
  return Buffer.from(hex.replace(/^0x/, ''), 'hex')
    .toString()
    .replace(/\x00/g, ''); // eslint-disable-line no-control-regex
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
