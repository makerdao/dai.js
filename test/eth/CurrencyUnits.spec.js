import CurrencyUnits from '../../src/eth/CurrencyUnits';
import { RAY } from '../../src/utils/constants';

test('parses an amount and currency symbol', () => {
  expect(CurrencyUnits.getCurrency(1, 'dai').toString()).toBe('1.00 DAI');
  expect(CurrencyUnits.getCurrency(1, 'mkr').toString()).toBe('1.00 MKR');
  expect(CurrencyUnits.getCurrency(1, 'weth').toString()).toBe('1.00 WETH');
  expect(CurrencyUnits.getCurrency(1, 'peth').toString()).toBe('1.00 PETH');
  expect(CurrencyUnits.getCurrency(1, 'eth').toString()).toBe('1.00 ETH');
});

test('parses an amount + currency class', () => {
  const { ETH, PETH, WETH, DAI, MKR } = CurrencyUnits;
  expect(CurrencyUnits.getCurrency(1, ETH).toString()).toBe('1.00 ETH');
  expect(CurrencyUnits.getCurrency(1, PETH).toString()).toBe('1.00 PETH');
  expect(CurrencyUnits.getCurrency(1, WETH).toString()).toBe('1.00 WETH');
  expect(CurrencyUnits.getCurrency(1, DAI).toString()).toBe('1.00 DAI');
  expect(CurrencyUnits.getCurrency(1, MKR).toString()).toBe('1.00 MKR');
});

test('throws an error if there is no unit', () => {
  expect(() => {
    CurrencyUnits.getCurrency(1);
  }).toThrowError('Unit not specified');
});

test('throws an error if amount is negative', () => {
  expect(() => {
    CurrencyUnits.getCurrency('-1', 'eth');
  }).toThrowError('amount cannot be negative');
});

test('converts wei/wad', () => {
  const value = CurrencyUnits.convert('2110000000000000000', 'peth');
  expect(value.toString()).toBe('2.11 PETH');
});

test('converts ray', () => {
  const rayValue = '5130000000000000000000000000';
  const value = CurrencyUnits.convert(rayValue, 'eth', RAY);
  expect(value.toString()).toBe('5.13 ETH');
});

test('prints the specified number of decimals', () => {
  const n = CurrencyUnits.MKR('1000.5447123');
  expect(n.toString(3)).toBe('1000.545 MKR');
});
