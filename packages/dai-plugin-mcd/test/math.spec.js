import { daiAvailable } from '../src/math';
import { USD, DAI } from '../src';

test('daiAvailable', () => {
  expect(daiAvailable(USD(10), USD(5), 1)).toEqual(DAI(5));
});

test('daiAvailable handles undercollateralized values', () => {
  expect(daiAvailable(USD(10), USD(5), 2.1)).toEqual(DAI(0));
});
