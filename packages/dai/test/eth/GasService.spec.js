import { buildTestService } from '../helpers/serviceBuilders';
import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';

let getDummyTransaction, gasService;

beforeEach(async () => {
  gasService = buildTestGasService();
  await gasService.manager().authenticate();
});

function buildTestGasService() {
  const service = buildTestService('gas', { gas: true });

  getDummyTransaction = function() {
    return {
      from: TestAccountProvider.nextAddress(),
      to: TestAccountProvider.nextAddress(),
      amount: service
        .get('web3')
        .utils.parseEther('0.01')
        .toString()
    };
  };

  return service;
}

test('initial values', async () => {
  const secondService = buildTestService('gas', {
    gas: {
      limit: {
        multiplier: 2,
        fallback: 2,
        absolute: 2,
        disable: true
      },
      price: {
        transactionSpeed: 'fastest',
        disable: true
      }
    }
  });
  await secondService.manager().authenticate();

  expect(gasService.multiplier).toBe(1.55);
  expect(gasService.fallback).toBe(4000000);
  expect(gasService.transactionSpeed).toBe('fast');

  expect(secondService.multiplier).toBe(2);
  expect(secondService.absolute).toBe(2);
  expect(secondService.fallback).toBe(2);
  expect(secondService.transactionSpeed).toBe('fastest');
  expect(secondService.disablePrice).toBe(true);
  expect(secondService.disableLimit).toBe(true);
});

test('update policies', () => {
  gasService.multiplier = 1;
  expect(gasService.multiplier).toBe(1);
  gasService.absolute = 100000;
  expect(gasService.absolute).toBe(100000);
  gasService.fallback = 100000;
  expect(gasService.fallback).toBe(100000);
});

test('clear policies', () => {
  gasService.removeMultiplier();
  expect(gasService.multiplier).toBe(null);
  gasService.absolute = 100000;
  gasService.removeAbsolute();
  expect(gasService.absolute).toBe(null);
  gasService.removeFallback();
  expect(gasService.fallback).toBe(null);
});

test('use multiplier when absolute null', async () => {
  gasService.multiplier = 1.1;
  const estimate = await gasService.estimateGasLimit(getDummyTransaction());
  expect(estimate).toBeCloseTo(21000 * 1.1);
});

test('use absolute when multiplier null', async () => {
  gasService.absolute = 20000;
  const transaction = await getDummyTransaction();
  const estimate = await gasService.estimateGasLimit(transaction);
  expect(estimate).toBe(20000);
});

test('choose minimum when both policies set using multiplier', async () => {
  gasService.multiplier = 1.1;
  gasService.absolute = 1000000;
  const estimate = await gasService.estimateGasLimit(getDummyTransaction());
  expect(estimate).toBeCloseTo(21000 * 1.1);
});

test('throws on setting policy less than zero', () => {
  expect(() => (gasService.multiplier = -1)).toThrow();
  expect(() => (gasService.absolute = -1)).toThrow();
  expect(() => (gasService.fallback = -1)).toThrow();
});

test('throws on invalid transaction speed', () => {
  expect(() => (gasService.transactionSpeed = 'sluggish')).toThrow();
});

test('fetches gas station data', async () => {
  const keys = ['fast', 'fastWait'];

  expect(Object.keys(await gasService._gasStationDataPromise)).toEqual(keys);
});

test('returns a valid gas price', async () => {
  const gasStationData = await gasService._gasStationDataPromise;
  const gasPrice = await gasService.getGasPrice();
  const num = (gasStationData['fast'] / 10).toString();
  const expectedValue = gasService
    .get('web3')
    .utils.parseUnits(num, 'gwei')
    .toString();
  //100000000 current
  //100000000 new
  expect(typeof gasPrice).toBe('string');
  expect(gasPrice).toBe(expectedValue);
});

test('returns a valid wait time', async () => {
  const gasStationData = await gasService._gasStationDataPromise;
  const waitTime = await gasService.getWaitTime();
  expect(typeof waitTime).toBe('number');
  expect(waitTime).toBe(gasStationData['fastWait']);
});

test('setting an explicit gasLimit bypasses estimation', async () => {
  const secondService = buildTestService('gas', {
    gas: {
      limit: 2
    }
  });
  await secondService.manager().authenticate();
  expect(await secondService.estimateGasLimit()).toBe(2);
});

test('setting an explicit gasPrice bypasses gasStation data', async () => {
  const secondService = buildTestService('gas', {
    gas: {
      price: 2
    }
  });
  await secondService.manager().authenticate();

  expect(await secondService.getGasPrice()).toBe(2);
});

test('disabling gasLimit returns fallback', async () => {
  const secondService = buildTestService('gas', {
    gas: {
      limit: {
        disable: true
      }
    }
  });
  await secondService.manager().authenticate();

  expect(await secondService.estimateGasLimit()).toBe(4000000);
});
