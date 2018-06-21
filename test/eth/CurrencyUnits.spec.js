import CurrencyUnits from '../../src/eth/CurrencyUnits';

test('parses an amount and currency symbol', () => {
  expect(CurrencyUnits.getCurrency(1, 'dai').toString()).toBe('1 DAI');
  expect(CurrencyUnits.getCurrency(1, 'mkr').toString()).toBe('1 MKR');
  expect(CurrencyUnits.getCurrency(1, 'weth').toString()).toBe('1 WETH');
  expect(CurrencyUnits.getCurrency(1, 'peth').toString()).toBe('1 PETH');
  expect(CurrencyUnits.getCurrency(1, 'eth').toString()).toBe('1 ETH');
});

test('parses an amount + currency class', () => {
  const { ETH, PETH, WETH, DAI, MKR } = CurrencyUnits;
  expect(CurrencyUnits.getCurrency(1, ETH).toString()).toBe('1 ETH');
  expect(CurrencyUnits.getCurrency(1, PETH).toString()).toBe('1 PETH');
  expect(CurrencyUnits.getCurrency(1, WETH).toString()).toBe('1 WETH');
  expect(CurrencyUnits.getCurrency(1, DAI).toString()).toBe('1 DAI');
  expect(CurrencyUnits.getCurrency(1, MKR).toString()).toBe('1 MKR');
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

test('converts wei', () => {
  const value = CurrencyUnits.convertWei('2000000000000000000', 'peth');
  expect(value.toString()).toBe('2 PETH');
});
