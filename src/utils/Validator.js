import BigNumber from 'bignumber.js';
import { utils } from 'ethers';

// have methods for every target format
export default class Validator {
  static amountToString(amount) {
    return amount.toString();
  }

  static amountToBigNumber(amount) {
    return BigNumber(amount);
  }

  static parseUnits(amount, decimalsOrString = 18) {
    // TODO: throw if decimalsOrString='ether' it's not working
    const stringAmount = amount.toString();
    return this.BNToBigNumber(utils.parseUnits(stringAmount, decimalsOrString));
  }

  static bytes32ToBigNumber(bytes32) {
    return BigNumber(bytes32);
  }

  static bytes32ToNumber(bytes32) {
    return BigNumber(bytes32).toNumber();
  }

  static stringToBytes32(text) {
    var data = utils.toUtf8Bytes(text);
    if (data.length > 32) {
      throw new Error('too long');
    }
    data = utils.padZeros(data, 32);
    return utils.hexlify(data);
  }

  static bigNumberToBN(bigNum) {
    return utils.bigNumberify(bigNum.toString());
  }

  static BNToBigNumber(bn) {
    return BigNumber(bn.toString());
  }

  static bigNumberToBytes32(bigNum) {
    // TODO: add check for decimals in bigNum and throw if so, bigNumberify can't handle
    return (
      '0x' +
      utils
        .bigNumberify(bigNum.toNumber())
        .toHexString()
        .substring(2)
        .padStart(64, '0')
    );
  }

  static numberToBytes32(num) {
    // TODO: add check for decimals in num and throw if so, bigNumberify can't handle
    return (
      '0x' +
      utils
        .bigNumberify(num)
        .toHexString()
        .substring(2)
        .padStart(64, '0')
    );
  }

  _isString(value) {
    return typeof value === 'string' || value instanceof String;
  }

  _isNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  _isNullOrUndefined(value) {
    return value === null || typeof value === 'undefined';
  }
}
