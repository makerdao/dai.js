import {
  numberToBytes32,
  bytes32ToNumber,
  stringToBytes32
} from '../../src/utils/conversion';

test('numberToBytes32', () => {
  expect(numberToBytes32(92)).toBe(
    '0x000000000000000000000000000000000000000000000000000000000000005c'
  );
});

test('bytes32ToNumber', () => {
  const bytes32 =
    '0x000000000000000000000000000000000000000000000000000000000000005c';
  expect(bytes32ToNumber(bytes32)).toBe(92);
});

test('stringToBytes32', () => {
  expect(stringToBytes32('hello')).toBe(
    '0x00000000000000000000000000000000000000000000000000000068656c6c6f'
  );
});
