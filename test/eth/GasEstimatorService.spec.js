import { buildTestService } from '../helpers/serviceBuilders';
import TestAccountProvider from '../helpers/TestAccountProvider';

let getDummyTransaction, gasEstimator;

beforeEach(async () => {
  gasEstimator = buildTestGasEstimatorService();
  await gasEstimator.manager().authenticate();
});

function buildTestGasEstimatorService() {
  const service = buildTestService('gasEstimator', { gasEstimator: true });

  getDummyTransaction = function() {
    return {
      from: TestAccountProvider.nextAddress(),
      to: TestAccountProvider.nextAddress(),
      amount: service.get('web3')._web3.utils.toWei('0.01')
    };
  };

  return service;
}

test('initial values', async () => {
  const secondService = buildTestService('gasEstimator', {
    gasEstimator: true,
    web3: {
      transactionSettings: {
        multiplier: 2,
        fallback: 2,
        absolute: 2,
        transactionSpeed: 'fastest'
      }
    }
  });
  await secondService.manager().authenticate();

  expect(gasEstimator.multiplier).toBe(1.55);
  expect(gasEstimator.absolute).toBe(null);
  expect(gasEstimator.fallback).toBe(4000000);
  expect(gasEstimator.transactionSpeed).toBe('fast');

  expect(secondService.multiplier).toBe(2);
  expect(secondService.absolute).toBe(2);
  expect(secondService.fallback).toBe(2);
  expect(secondService.transactionSpeed).toBe('fastest');
});

test('update policies', () => {
  gasEstimator.multiplier = 1;
  expect(gasEstimator.multiplier).toBe(1);
  gasEstimator.absolute = 100000;
  expect(gasEstimator.absolute).toBe(100000);
  gasEstimator.fallback = 100000;
  expect(gasEstimator.fallback).toBe(100000);
});

test('clear policies', () => {
  gasEstimator.removeMultiplier();
  expect(gasEstimator.multiplier).toBe(null);
  gasEstimator.absolute = 100000;
  gasEstimator.removeAbsolute();
  expect(gasEstimator.absolute).toBe(null);
  gasEstimator.removeFallback();
  expect(gasEstimator.fallback).toBe(null);
});

test('use multiplier when absolute null', async () => {
  gasEstimator.multiplier = 1.1;
  const estimate = await gasEstimator.estimateGasLimit(getDummyTransaction());
  expect(estimate).toBeCloseTo(21000 * 1.1);
});

test('use absolute when multiplier null', async () => {
  gasEstimator.absolute = 20000;
  const transaction = await getDummyTransaction();
  const estimate = await gasEstimator.estimateGasLimit(transaction);
  expect(estimate).toBe(20000);
});

test('choose minimum when both policies set using multiplier', async () => {
  gasEstimator.multiplier = 1.1;
  gasEstimator.absolute = 1000000;
  const estimate = await gasEstimator.estimateGasLimit(getDummyTransaction());
  expect(estimate).toBeCloseTo(21000 * 1.1);
});

test('throws on setting policy less than zero', () => {
  expect(() => (gasEstimator.multiplier = -1)).toThrow();
  expect(() => (gasEstimator.absolute = -1)).toThrow();
  expect(() => (gasEstimator.fallback = -1)).toThrow();
});

test('throws on invalid transaction speed', () => {
  expect(() => (gasEstimator.transactionSpeed = 'sluggish')).toThrow();
});

test('fetches gas station data on authentication', async () => {
  const keys = [
    'fast',
    'fastest',
    'safeLow',
    'average',
    'block_time',
    'blockNum',
    'speed',
    'safeLowWait',
    'avgWait',
    'fastWait',
    'fastestWait'
  ];

  expect(Object.keys(await gasEstimator.gasStationData)).toEqual(keys);
});

test('returns a valid gas price', async () => {
  const gasStationData = await gasEstimator.gasStationData;
  const gasPrice = await gasEstimator.getGasPrice();
  expect(typeof gasPrice).toBe('number');
  expect(gasPrice).toBe(gasStationData['fast']);
});

test('returns a valid wait time', async () => {
  const gasStationData = await gasEstimator.gasStationData;
  const waitTime = await gasEstimator.getWaitTime();
  expect(typeof waitTime).toBe('number');
  expect(waitTime).toBe(gasStationData['fastWait']);
});
