import { promisify, getNetworkName } from '../../src/utils';

describe('promisify makes async functions return Promises', () => {
  test('arguments can be passed and results are resolved', () => {
    expect.assertions(1);

    const argVal = 'foobar';
    const promisified = promisify((arg1, cb) => {
      cb(null, arg1);
    });

    promisified(argVal).then(val => {
      expect(val).toEqual(argVal);
    });
  });

  test('errors are rejected', () => {
    expect.assertions(1);

    const errVal = 'foobar';
    const promisified = promisify(cb => {
      cb(errVal);
    });

    promisified().catch(val => {
      expect(val).toEqual(errVal);
    });
  });
});

describe('getNetworkName', () => {
  test('should return the name of the matched network', () => {
    expect(getNetworkName(42)).toBe('kovan');
  });

  test('should throw an error if no network is matched', () => {
    expect(() => getNetworkName(43)).toThrow('No network with ID 43 found.');
  });
});
