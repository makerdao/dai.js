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
    let err = new Error('negative amounts not allowed');
  }
  expect(err).toContain('negative');
});


  test('should parse and output a CurrencyUnits object for all currency types', done => {
    let amountDai = 1;
    let unitDai = 'dai';
    let curr1 = CurrencyUnits.getCurrency(amountDai, unitDai);
    expect(curr1.toString()).toBe('DAI(1)');

    let amountMkr = 1;
    let unitMkr = 'mkr';
    let curr2 = CurrencyUnits.getCurrency(amountMkr, unitMkr);
    expect(curr2.toString()).toBe('MKR(1)');

    let amountWeth = 1;
    let unitWeth = 'weth';
    let curr3 = CurrencyUnits.getCurrency(amountWeth, unitWeth);
    expect(curr3.toString()).toBe('WETH(1)');

    let amountPeth = 1;
    let unitPeth = 'peth';
    let curr4 = CurrencyUnits.getCurrency(amountPeth, unitPeth);
    expect(curr4.toString()).toBe('PETH(1)');

    let amountEth = 1;
    let unitEth = 'eth';
    let curr5 = CurrencyUnits.getCurrency(amountEth, unitEth);
    expect(curr5.toString()).toBe('ETH(1)');
  });
