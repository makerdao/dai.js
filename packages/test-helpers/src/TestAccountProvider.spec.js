import {
  default as provider,
  TestAccountProvider
} from './TestAccountProvider';

test('should reject illegal indices', () => {
  const msg =
    'Index must be a natural number between 0 and ' +
    (provider._accounts.addresses.length - 1);
  expect(() => provider.setIndex(-1)).toThrow(msg);
  expect(() => provider.setIndex(provider._accounts.length)).toThrow(msg);
  expect(() => provider.setIndex('Not a number')).toThrow(msg);
});

test('should reject accounts objects', () => {
  expect(
    () => new TestAccountProvider({ addresses: ['x'], keeys: ['y'] })
  ).toThrow('Accounts must be an object with properties addresses and keys');

  expect(
    () =>
      new TestAccountProvider({ addresses: ['x', 'y', 'z'], keys: ['x', 'y'] })
  ).toThrow('Accounts addresses and keys arrays must have the same length');
});

test('test provider provides 1000 addresses and keys', () => {
  const originalIndex = provider.getIndex();
  let error = -1;

  provider.setIndex(0);
  for (let i = 0; i < 500; i++) {
    let account = provider.nextAccount();
    if (
      typeof account.address !== 'string' ||
      typeof account.key !== 'string'
    ) {
      error = i;
    }
  }

  for (let i = 0; i < 500; i++) {
    let address = provider.nextAddress();
    if (typeof address !== 'string') {
      error = i;
    }
  }

  expect(error).toBe(-1);
  expect(() => provider.nextAccount()).toThrow(
    'No more test accounts available.'
  );

  provider.setIndex(originalIndex);
  expect(provider.getIndex()).toBe(originalIndex);
});
