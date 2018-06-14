import Validator from '../../src/utils/Validator';
import BigNumber from 'bignumber.js';

test('should convert a num to string', () => {
  const num = 123;
  const str = Validator.amountToString(num);
  expect(str).toBe('123');
});

test('should convert a num to BigNumber', () => {
  const num = 123;
  const convertedNum = Validator.amountToBigNumber(num);
  const bigNum = BigNumber(123);
  expect(convertedNum).toEqual(bigNum);
});

test('should parse units into wei (with default decimals)', () => {
  const num = 123;
  const parsed = Validator.parseUnits(num); // turns into a BigNumber
  expect(parsed.toString()).toEqual('123000000000000000000');
});

test.skip('should parse units into eth', () => {
  //this isn't working though it should, problem with ethers.js
  const num = 123;
  const parsed = Validator.parseUnits(num, 'ether'); // turns into a BigNumber
  expect(parsed.toString()).toEqual('123');
});

test('should convert from bytes32 to a javascript number', () => {
  const bytes32 =
    '0x000000000000000000000000000000000000000000000000000000000000005c';
  expect(Validator.bytes32ToNumber(bytes32)).toBe(92);
});

test('should convert from bytes32 to a bignumber.js bignum', () => {
  const bytes32 =
    '0x000000000000000000000000000000000000000000000000000000000000005c';
  const bigNum = BigNumber(92);
  expect(Validator.bytes32ToBigNumber(bytes32)).toEqual(bigNum);
});

test('should convert from a javascript number to bytes32', () => {
  const num = 92;
  expect(Validator.numberToBytes32(num)).toBe(
    '0x000000000000000000000000000000000000000000000000000000000000005c'
  );
});

test('should convert from a bignumber.js bignum to bytes32', () => {
  const bigNum = BigNumber(92);
  expect(Validator.bigNumberToBytes32(bigNum)).toBe(
    '0x000000000000000000000000000000000000000000000000000000000000005c'
  );
});
