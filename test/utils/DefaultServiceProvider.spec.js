import DefaultServiceProvider from '../../src/utils/DefaultServiceProvider';
import SmartContractService from '../../src/eth/SmartContractService';
import config from '../../src/utils/configs/decentralized-oasis-without-proxies';

test('Should support services in mapping', () => {
  expect(new DefaultServiceProvider().supports('SmartContractService')).toBe(true);
});

test('Should not support services not in mapping', () => {
  expect(new DefaultServiceProvider().supports('DoesNotExist')).toBe(false);
});

test('Should correctly create a supported service', () => {
  expect(new DefaultServiceProvider().create('SmartContractService')).toBeInstanceOf(SmartContractService);
});

test('Should return null when attempting to create an unsupported service', () => {
  expect(new DefaultServiceProvider().create('DoesNotExist')).toBe(null);
});

/*
test('Should configure the settings of a created service', done => {
  new DefaultServiceProvider().create('SmartContractService', { mySettings: 42 }).initialize().then();
  expect()
    .toBeInstanceOf(true);
});
*/

test('Should correctly create a container with all services when passed a service configuration', done => {
  const container = new DefaultServiceProvider().buildContainer(config.services);
  expect(Object.keys(container._services).indexOf('smartContract')).toBeGreaterThan(-1);
  container.authenticate().then(() => {
    expect(container.service('web3').manager().isAuthenticated()).toBe(true);
    done();
  });
});

test('Should throw an error when passing a config with unsupported service', () => {
  const servicesCopy = {...config.services};
  console.log('servicesCopy is: ', servicesCopy);
  servicesCopy.missingService = 'DoesNotExist';
  expect(() => new DefaultServiceProvider().buildContainer(servicesCopy))
    .toThrow('Unsupported service in configuration: DoesNotExist');
});
