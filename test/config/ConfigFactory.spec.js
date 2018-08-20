import oasis from '../../src/config/presets/oasis';
import ConfigFactory from '../../src/config/ConfigFactory';

test('returns a preset by name', () => {
  expect(ConfigFactory.create('oasis')).toEqual(oasis);
});

test('returns a preset by alias', () => {
  expect(ConfigFactory.create('test')).toEqual(oasis);
});

test('throws an error when requesting a non-existing preset', () => {
  expect(() => ConfigFactory.create('does-not-exist')).toThrow(
    'Cannot find configuration preset with name: does-not-exist'
  );
});

test('can take an options object in addition to a preset name', () => {
  const config = ConfigFactory.create('test', { log: false });
  expect(config.log).toEqual(false);
});

test('can take an options object as first argument', () => {
  const config = ConfigFactory.create({ preset: 'test', log: false });
  expect(config.log).toEqual(false);
});

test('it handles url, privateKey, provider, and web3 options', () => {
  const config = ConfigFactory.create(
    'http',
    {
      url: 'http://foo.net',
      privateKey: '0xf00',
      provider: {
        timeout: 1000
      },
      web3: {
        statusTimerDelay: 10000,
        usePresetProvider: true
      }
    },
    {
      defaults: {
        web3: 'Web3Service'
      }
    }
  );

  expect(config).toEqual({
    accounts: {
      default: {
        type: 'privateKey',
        key: '0xf00'
      }
    },
    web3: [
      'Web3Service',
      {
        statusTimerDelay: 10000,
        usePresetProvider: true,
        provider: {
          timeout: 1000,
          type: 'HTTP',
          url: 'http://foo.net'
        }
      }
    ],
    exchange: 'OasisExchangeService'
  });
});

test('it overwrites a service name', () => {
  const config = ConfigFactory.create('http', { exchange: 'OtherService' });
  expect(config.exchange).toEqual(['OtherService', {}]);
});

test('it adds service options', () => {
  const config = ConfigFactory.create('http', { exchange: { foo: 'bar' } });
  expect(config.exchange).toEqual(['OasisExchangeService', { foo: 'bar' }]);
});

test('it passes service options for an omitted service', () => {
  const config = ConfigFactory.create('http', { cdp: { foo: 'bar' } });
  expect(config.cdp).toEqual({ foo: 'bar' });
});

test('it preserves the preset service name', () => {
  const preset = { log: 'BunyanLogger' };
  const config = ConfigFactory.create({ preset, log: { verbose: true } });
  expect(config.log).toEqual(['BunyanLogger', { verbose: true }]);
});

test('it overrides metamask when specified in options', () => {
  const firstConfig = ConfigFactory.create('kovan', { overrideMetamask: true });
  const secondConfig = ConfigFactory.create('kovan');
  const thirdConfig = ConfigFactory.create('kovan', {
    overrideMetamask: false
  });
  const firstConfigProvider =
    firstConfig.web3.usePresetProvider !== undefined
      ? firstConfig.web3.usePresetProvider
      : firstConfig.web3.usePresetProvider[1];
  const secondConfigProvider =
    secondConfig.web3.usePresetProvider !== undefined
      ? secondConfig.web3.usePresetProvider
      : secondConfig.web3.usePresetProvider[1];
  const thirdConfigProvider =
    thirdConfig.web3.usePresetProvider !== undefined
      ? thirdConfig.web3.usePresetProvider
      : thirdConfig.web3.usePresetProvider[1];

  expect(firstConfigProvider).toEqual(false);
  expect(secondConfigProvider).toEqual(true);
  expect(thirdConfigProvider).toEqual(true);
});

test('skip unknown service roles', () => {
  const config = ConfigFactory.create('http', {
    foo: 'FooService'
  });
  expect(config.foo).toBeFalsy();
});

test('allow new service roles if specified', () => {
  const config = ConfigFactory.create('http', {
    additionalServices: ['foo'],
    foo: 'FooService'
  });
  expect(config.foo).toEqual('FooService');
});

test('reject invalid service roles', () => {
  expect(() => {
    ConfigFactory.create('http', {
      additionalServices: ['url']
    });
  }).toThrow(/cannot be used as service role names/);
});
