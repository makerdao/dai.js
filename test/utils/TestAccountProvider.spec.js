import TestAccountProvider from '../../src/utils/TestAccountProvider';

test('test provider provides 1000 addresses and keys', () => {

  let error = -1;

  for (let i=0; i<500; i++) {
    let account = TestAccountProvider.nextAccount();
    if (typeof account.address !== 'string' || typeof account.key !== 'string') {
      error = i;
      //console.error('Invalid account', account);
    }
  }

  for (let i=0; i<500; i++) {
    let address = TestAccountProvider.nextAddress();
    if (typeof address !== 'string') {
      error = i;
      //console.error('Invalid address', address);
    }
  }

  expect(error).toBe(-1);
  expect(() => TestAccountProvider.nextAccount()).toThrow('No more test accounts available.');

});