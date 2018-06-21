import BigNumber from 'bignumber.js';
import { utils } from 'ethers';

// have methods for every target format
export default class Validator {
  static amountToString(amount) {
    return amount.toString();
  }

  static stringToBigNumber(str){
    if (_isString(str)) {
      let bytesAmount = this.stringToBytes32(str);
      let bigNum = this.bytes32ToBigNumber(bytesAmount);
      return bigNum
    }
  }

  static stringToNumber(str){
    if (_isString(str)) {
      let bytesAmount = this.stringToBytes32(str);
      let num = this.bytes32ToNumber(bytesAmount);
      return num;
    }
  }

  static amountToBigNumber(amount) {
    if (amount < 0) {
      throw 'amount can not be less than 0';
    }
    // TODO: add guard for address, and if it's over a trillion
    return BigNumber(amount);
  }

  static parseUnits(amount, decimalsOrString = 18) {
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

  static isString(value) {
    return typeof value === 'string' || value instanceof String;
  }

  static isNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  static isNullOrUndefined(value) {
    return value === null || typeof value === 'undefined';
  }
}
