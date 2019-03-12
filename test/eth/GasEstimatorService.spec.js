import { buildTestService } from '../helpers/serviceBuilders';
import TestAccountProvider from '../helpers/TestAccountProvider';

let getDummyTransaction;

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

test('policies initially null', done => {
  const gasEstimator = buildTestGasEstimatorService();

  gasEstimator
    .manager()
    .connect()
    .then(() => {
      expect(gasEstimator.getPercentage()).toBe(1.55);
      expect(gasEstimator.getAbsolute()).toBe(null);
      done();
    });
});

test('update policies', done => {
  const gasEstimator = buildTestGasEstimatorService();

  gasEstimator
    .manager()
    .connect()
    .then(() => {
      gasEstimator.setPercentage(1);
      expect(gasEstimator.getPercentage()).toBe(1);
      gasEstimator.setAbsolute(100000);
      expect(gasEstimator.getAbsolute()).toBe(100000);
      gasEstimator.setFallback(100000);
      expect(gasEstimator.getFallback()).toBe(100000);
      done();
    });
});

test('clear policies', done => {
  const gasEstimator = buildTestGasEstimatorService();

  gasEstimator
    .manager()
    .connect()
    .then(() => {
      gasEstimator.removePercentage();
      expect(gasEstimator.getPercentage()).toBe(null);
      gasEstimator.setAbsolute(100000);
      gasEstimator.removeAbsolute();
      expect(gasEstimator.getAbsolute()).toBe(null);
      gasEstimator.removeFallback();
      expect(gasEstimator.getFallback()).toBe(null);

      done();
    });
});

test('use percentage when absolute null', done => {
  const gasEstimator = buildTestGasEstimatorService();

  gasEstimator
    .manager()
    .connect()
    .then(() => {
      gasEstimator.setPercentage(1.1);
      return gasEstimator.estimateGasLimit(getDummyTransaction());
    })
    .then(estimate => {
      expect(estimate.gasLimit).toBeCloseTo(21000 * 1.1);
      done();
    });
});

test('use absolute when percentage null', done => {
  const gasEstimator = buildTestGasEstimatorService();

  gasEstimator
    .manager()
    .connect()
    .then(() => {
      gasEstimator.setAbsolute(20000);
      return getDummyTransaction();
    })
    .then(transaction => gasEstimator.estimateGasLimit(transaction))
    .then(estimate => {
      expect(estimate.gasLimit).toBe(20000);
      done();
    });
});

test('choose minimum when both policies set using percentage', done => {
  const gasEstimator = buildTestGasEstimatorService();

  gasEstimator
    .manager()
    .connect()
    .then(() => {
      gasEstimator.setPercentage(1.1);
      gasEstimator.setAbsolute(1000000);
      return gasEstimator.estimateGasLimit(getDummyTransaction());
    })
    .then(estimate => {
      expect(estimate.gasLimit).toBeCloseTo(21000 * 1.1);
      done();
    });
});

test('throws on setting policy less than zero', done => {
  const gasEstimator = buildTestGasEstimatorService();

  gasEstimator
    .manager()
    .connect()
    .then(() => {
      expect(() => gasEstimator.setPercentage(-1)).toThrow();
      expect(() => gasEstimator.setAbsolute(-1)).toThrow();
      expect(() => gasEstimator.setFallback(-1)).toThrow();
      done();
    });
});
