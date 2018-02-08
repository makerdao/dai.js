import GasEstimatorService from './GasEstimatorService';
import Web3Service from '../web3/Web3Service';
import NullLoggerService from '../loggers/NullLogger/NullLoggerService';

function buildGasEstimatorService(){
  const log = new NullLoggerService(),
    web3 = new Web3Service(),
    gasEstimator = new GasEstimatorService();
  web3.manager().inject('log', log);
  gasEstimator.manager().inject('log', log);
  gasEstimator.manager().inject('web3', web3);
  return gasEstimator; //could also call connect here
}

test('policies initially null', (done) => {
  const gasEstimator = buildGasEstimatorService();
  gasEstimator.manager().connect()
    .then(() => {
      expect(gasEstimator.getPercentage()).toBe(null);
      expect(gasEstimator.getAbsolute()).toBe(null);
      done();
    });
});

test('update policies', (done) => {
  const gasEstimator = buildGasEstimatorService();
  gasEstimator.manager().connect()
    .then(() => {
      gasEstimator.setPercentage(1);
      expect(gasEstimator.getPercentage()).toBe(1);
      gasEstimator.setAbsolute(100000);
      expect(gasEstimator.getAbsolute()).toBe(100000);
      done();
    });
});

test('clear policies', (done) => {
  const gasEstimator = buildGasEstimatorService();
  gasEstimator.manager().connect()
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

test('use percentage when absolute null', (done) => { 
  const gasEstimator = buildGasEstimatorService();
  const web3 = gasEstimator.get('web3');
  gasEstimator.manager().connect()
    .then(()=>{
      gasEstimator.setPercentage(1);
      return web3.getDummyTransaction();})
    .then(transaction => gasEstimator.estimateGasLimit(transaction))
    .then(estimate => {
      expect(estimate).toBe(21464); //uses percentage policy
      done();
    });
});

test('use absolute when percentage null', (done) => { 
  const gasEstimator = buildGasEstimatorService();
  const web3 = gasEstimator.get('web3');
  gasEstimator.manager().connect()
    .then(()=>{
      gasEstimator.setAbsolute(20000);
      return web3.getDummyTransaction();})
    .then(transaction => gasEstimator.estimateGasLimit(transaction))
    .then(estimate => {
      expect(estimate).toBe(20000);
      done();
    });
});

test('choose minimum when both policies set using percentage', (done) => { 
  const gasEstimator = buildGasEstimatorService();
  const web3 = gasEstimator.get('web3');
  gasEstimator.manager().connect()
    .then(()=>{
      gasEstimator.setPercentage(1);
      gasEstimator.setAbsolute(1000000);
      return web3.getDummyTransaction();})
    .then(transaction => gasEstimator.estimateGasLimit(transaction))
    .then(estimate => {
      expect(estimate).toBe(21464);
      done();
    });
});


//TODO
test('does not set estimate greater than block gas limit', (done) => { 
  const gasEstimator = buildGasEstimatorService();
  const web3 = gasEstimator.get('web3');
  gasEstimator.manager().connect()
    .then(()=>{
      gasEstimator.setPercentage(1);
      gasEstimator.setAbsolute(20000);
      return web3.getDummyTransaction();})
    .then(transaction => gasEstimator.estimateGasLimit(transaction))
    .then(estimate => {
      expect(estimate).toBe(20000);
      done();
    });
});


//I think we should instead offer some kind of default value 
test('throws when estimating without a policy', (done) => { 
  const gasEstimator = buildGasEstimatorService();
  const web3 = gasEstimator.get('web3');
  gasEstimator.manager().connect()
    .then(()=> web3.getDummyTransaction())
    .then(transaction => {
      expect(() => gasEstimator.estimateGasLimit(transaction)).toThrow();
      done();
    });
});


test('throws on setting policy less than zero', (done) => {
  const gasEstimator = buildGasEstimatorService();
  gasEstimator.manager().connect()
    .then(() => {
      expect(() => gasEstimator.setPercentage(-1)).toThrow();
      expect(() => gasEstimator.setAbsolute(-1)).toThrow();
      done();
    });
});

