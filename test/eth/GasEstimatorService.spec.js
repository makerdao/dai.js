import { buildTestService } from '../helpers/serviceBuilders';
import TestAccountProvider from '../helpers/TestAccountProvider';

let getDummyTransaction;

function buildTestGasEstimatorService() {
  const service = buildTestService('gasEstimator', { gasEstimator: true });

  getDummyTransaction = function() {
    return {
      from: TestAccountProvider.nextAddress(),
      to: TestAccountProvider.nextAddress(),
      amount: service.get('web3')._web3.toWei('0.01')
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
      expect(gasEstimator.getPercentage()).toBe(null);
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
      done();
    });
});

test('clear policies', done => {
  const gasEstimator = buildTestGasEstimatorService();

  gasEstimator
    .manager()
    .connect()
    .then(() => {
      gasEstimator.setPercentage(1);
      gasEstimator.removePercentage();
      expect(gasEstimator.getPercentage()).toBe(null);
      gasEstimator.setAbsolute(100000);
      gasEstimator.removeAbsolute();
      expect(gasEstimator.getAbsolute()).toBe(null);
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
      expect(estimate).toBeCloseTo(21000 * 1.1, 12);
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
      expect(estimate).toBe(20000);
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
      expect(estimate).toBeCloseTo(21000 * 1.1, 12);
      done();
    });
});

//I'll implement this test once I create the SmartContractService.  Then I'll be able to deploy and call a contract that uses too much gas to test this
/*
test('does not set estimate greater than block gas limit', (done) => {
  const gasEstimator = buildTestGasEstimatorService(),
    web3 = gasEstimator.get('web3');

  gasEstimator.manager().connect()
    .then(()=>{
      gasEstimator.setPercentage(1);
      gasEstimator.setAbsolute(20000);
      return getDummyTransaction();})
    .then(transaction => gasEstimator.estimateGasLimit(transaction))
    .then(estimate => {
      expect(estimate).toBe(20000);
      done();
    });
});*/

test('throws when estimating without a policy', done => {
  const gasEstimator = buildTestGasEstimatorService();

  gasEstimator
    .manager()
    .connect()
    .then(() => {
      expect(() =>
        gasEstimator.estimateGasLimit(getDummyTransaction())
      ).toThrow();
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
      done();
    });
});
