import { daiAvailable } from '../src/math';
import { USD, MDAI } from '../src';

test('daiAvailable', () => {
  expect(daiAvailable(USD(10), USD(5), 1)).toEqual(MDAI(5));
});

test('daiAvailable handles undercollateralized values', () => {
  expect(daiAvailable(USD(10), USD(5), 2.1)).toEqual(MDAI(0));
});
