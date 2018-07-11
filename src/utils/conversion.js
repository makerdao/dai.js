import { utils as ethersUtils } from 'ethers';

export function numberToBytes32(num) {
  const bn = ethersUtils.bigNumberify(num);
  return ethersUtils.hexlify(ethersUtils.padZeros(bn, 32));
}

export function bytes32ToNumber(bytes32) {
  return ethersUtils.bigNumberify(bytes32).toNumber();
}

export function stringToBytes32(text) {
  var data = ethersUtils.toUtf8Bytes(text);
  if (data.length > 32) {
    throw new Error('too long');
  }
  data = ethersUtils.padZeros(data, 32);
  return ethersUtils.hexlify(data);
}
