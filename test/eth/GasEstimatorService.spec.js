import { buildTestService } from '../helpers/serviceBuilders';
import TestAccountProvider from '../helpers/TestAccountProvider';

let getDummyTransaction, gasEstimator;

beforeEach(async () => {
  gasEstimator = buildTestGasEstimatorService();
  await gasEstimator.manager().connect();
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

test('policies initially null', () => {
  expect(gasEstimator.getPercentage()).toBe(1.55);
  expect(gasEstimator.getAbsolute()).toBe(null);
});

test('update policies', () => {
  gasEstimator.setPercentage(1);
  expect(gasEstimator.getPercentage()).toBe(1);
  gasEstimator.setAbsolute(100000);
  expect(gasEstimator.getAbsolute()).toBe(100000);
  gasEstimator.setFallback(100000);
  expect(gasEstimator.getFallback()).toBe(100000);
});

test('clear policies', () => {
  gasEstimator.removePercentage();
  expect(gasEstimator.getPercentage()).toBe(null);
  gasEstimator.setAbsolute(100000);
  gasEstimator.removeAbsolute();
  expect(gasEstimator.getAbsolute()).toBe(null);
  gasEstimator.removeFallback();
  expect(gasEstimator.getFallback()).toBe(null);
});

test('use percentage when absolute null', async () => {
  gasEstimator.setPercentage(1.1);
  const estimate = await gasEstimator.estimateGasLimit(getDummyTransaction());
  expect(estimate.gasLimit).toBeCloseTo(21000 * 1.1);
});

test('use absolute when percentage null', async () => {
  gasEstimator.setAbsolute(20000);
  const transaction = await getDummyTransaction();
  const estimate = await gasEstimator.estimateGasLimit(transaction);
  expect(estimate.gasLimit).toBe(20000);
});

test('choose minimum when both policies set using percentage', async () => {
  gasEstimator.setPercentage(1.1);
  gasEstimator.setAbsolute(1000000);
  const estimate = await gasEstimator.estimateGasLimit(getDummyTransaction());
  expect(estimate.gasLimit).toBeCloseTo(21000 * 1.1);
});

test('throws on setting policy less than zero', () => {
  expect(() => gasEstimator.setPercentage(-1)).toThrow();
  expect(() => gasEstimator.setAbsolute(-1)).toThrow();
  expect(() => gasEstimator.setFallback(-1)).toThrow();
});
