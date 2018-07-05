import { utils as ethersUtils } from 'ethers';

export function numberToBytes32(num) {
  return (
    '0x' +
    ethersUtils
      .bigNumberify(num)
      .toHexString()
      .substring(2)
      .padStart(64, '0')
  );
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
