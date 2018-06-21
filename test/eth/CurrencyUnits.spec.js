import CurrencyUnits from '../../src/eth/CurrencyUnits'

// example function using the above syntax / naming
// function example(amount, unit=ETH) {
//   const value = getCurrency(amount, unit)
//   console.log(value.toString());
//  }

test('should parse an amount + eth string and output a CurrencyUnits object', done => {
  let amount = 1;
  let unit = 'eth';
  let curr = CurrencyUnits.getCurrency(amount, unit);
  expect(curr.toString()).toBe('ETH(1)');
});

test('should parse an amount with no string and output a CurrencyUnits object', done => {
  let amount = 1;
  let curr = CurrencyUnits.getCurrency(amount);
  expect(curr.toString()).toBe('ETH(1)');
});


test('should parse a negative amount and return an error', done => {
  let amount = -1;
  let unit = 'eth';
  try {
    let curr = CurrencyUnits.getCurrency(amount, unit);
  } catch (error) {
    let err = error;
  }
  expect(err).toContain('negative');
});


  test('should parse and output a CurrencyUnits object for all currency types', done => {
    let amountDai = 1;
    let unitDai = 'dai';
    let curr = CurrencyUnits.getCurrency(amountDai, unitDai);
    expect(curr.toString()).toBe('DAI(1)');

    let amountMkr = 1;
    let unitMkr = 'mkr';
    let curr = CurrencyUnits.getCurrency(amountMkr, unitMkr);
    expect(curr.toString()).toBe('MKR(1)');

    let amountWeth = 1;
    let unitWeth = 'weth';
    let curr = CurrencyUnits.getCurrency(amountWeth, unitWeth);
    expect(curr.toString()).toBe('WETH(1)');

    let amountPeth = 1;
    let unitPeth = 'peth';
    let curr = CurrencyUnits.getCurrency(amountPeth, unitPeth);
    expect(curr.toString()).toBe('PETH(1)');

    let amountEth = 1;
    let unitEth = 'eth';
    let curr = CurrencyUnits.getCurrency(amountEth, unitEth);
    expect(curr.toString()).toBe('ETH(1)');
  });
