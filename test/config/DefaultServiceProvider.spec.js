import DefaultServiceProvider from '../../src/config/DefaultServiceProvider';
import config from '../../src/config/presets/test';
import LocalService from '../../src/core/LocalService';

test('support services in mapping', () => {
  expect(new DefaultServiceProvider().supports('SmartContractService')).toBe(
    true
  );
});

test('do not support services not in mapping', () => {
  expect(new DefaultServiceProvider().supports('DoesNotExist')).toBe(false);
});

test('add web3 config into accounts config', () => {
  const settings = { provider: { type: 'foo' } };
  const web3configs = [settings, ['Web3Service', settings]];

  for (let config of web3configs) {
    const provider = new DefaultServiceProvider({
      web3: config,
      accounts: { metamask: { type: 'browser' } }
    });

    expect(provider._config).toEqual({
      web3: config,
      accounts: {
        metamask: { type: 'browser' },
        web3: settings
      }
    });
  }
});

test('create a container from a service configuration', async () => {
  const container = new DefaultServiceProvider({
    ...config,
    log: false
  }).buildContainer();

  expect(
    Object.keys(container._services).indexOf('smartContract')
  ).toBeGreaterThan(-1);

  await container.authenticate();
  expect(
    container
      .service('web3')
      .manager()
      .isAuthenticated()
  ).toBe(true);
});

test('throw an error when config has an unsupported service', () => {
  const servicesCopy = {
    ...config,
    missingService: 'DoesNotExist'
  };
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

test('can define new service roles', () => {
  class FooService extends LocalService {
    constructor(name = 'foo') {
      super(name);
    }
  }
  const container = new DefaultServiceProvider({
    foo: FooService
  });

  const service = container.service('foo');
  expect(service instanceof FooService).toBeTruthy();
});
