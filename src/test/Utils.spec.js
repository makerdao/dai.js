import { promisifyAsync } from '../Utils';

describe('promisifyAsync makes async functions return Promises', () => {
  test('arguments can be passed and results are resolved', () => {
    expect.assertions(1);

    const argVal = 'foobar';
    const promisified = promisifyAsync((arg1, cb) => { cb(null, arg1); });

    promisified(argVal)
      .then((val) => {
        expect(val).toEqual(argVal);
      });
  });

  test('errors are rejected', () => {
    expect.assertions(1);

    const errVal = 'foobar';
    const promisified = promisifyAsync((cb) => { cb(errVal); });

    promisified()
      .catch((val) => {
        expect(val).toEqual(errVal);
      });
  });
});

