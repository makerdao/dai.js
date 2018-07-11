import DefaultServiceProvider from '../../src/config/DefaultServiceProvider';
import config from '../../src/config/presets/decentralized-oasis-without-proxies';
import LocalService from '../../src/core/LocalService';

test('Should support services in mapping', () => {
  expect(new DefaultServiceProvider().supports('SmartContractService')).toBe(
    true
  );
});

test('Should not support services not in mapping', () => {
  expect(new DefaultServiceProvider().supports('DoesNotExist')).toBe(false);
});

/*
test('Should configure the settings of a created service', done => {
  new DefaultServiceProvider().create('SmartContractService', { mySettings: 42 }).initialize().then();
  expect()
    .toBeInstanceOf(true);
});
*/

test('Should correctly create a container with all services when passed a service configuration', done => {
  const container = new DefaultServiceProvider({
    ...config.services,
    log: false
  }).buildContainer();
  expect(
    Object.keys(container._services).indexOf('smartContract')
  ).toBeGreaterThan(-1);
  container.authenticate().then(() => {
    expect(
      container
        .service('web3')
        .manager()
        .isAuthenticated()
    ).toBe(true);
    done();
  });
});

test('Should throw an error when passing a config with unsupported service', () => {
  const servicesCopy = { ...config.services };
  servicesCopy.missingService = 'DoesNotExist';
  expect(() =>
    new DefaultServiceProvider(servicesCopy).buildContainer()
  ).toThrow('Unsupported service in configuration: DoesNotExist');
});

test('constructor in config', () => {
  class FakeService extends LocalService {
    constructor(name = 'timer') {
      super(name);
    }
  }

  const container = new DefaultServiceProvider({
    timer: FakeService
  }).buildContainer();

  expect(container.service('timer') instanceof FakeService).toBeTruthy();
});
