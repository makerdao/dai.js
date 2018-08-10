import decentralizedOasisWithoutProxies from '../../src/config/presets/decentralized-oasis-without-proxies';
import ConfigFactory from '../../src/config/ConfigFactory';

test('returns a preset by name', () => {
  expect(ConfigFactory.create('decentralized-oasis-without-proxies')).toEqual(
    decentralizedOasisWithoutProxies
  );
});

test('returns a preset by alias', () => {
  expect(ConfigFactory.create('test')).toEqual(
    decentralizedOasisWithoutProxies
  );
});

test('throws an error when requesting a non-existing preset', () => {
  expect(() => ConfigFactory.create('does-not-exist')).toThrow(
    'Cannot find configuration preset with name: does-not-exist'
  );
});

test('can take an options object in addition to a preset name', () => {
  const config = ConfigFactory.create('test', { log: false });
  expect(config.global.enableProxies).toEqual(false);
  expect(config.services.log).toEqual(false);
});

test('can take an options object as first argument', () => {
  const config = ConfigFactory.create({ preset: 'test', log: false });
  expect(config.global.enableProxies).toEqual(false);
  expect(config.services.log).toEqual(false);
});

test('it merges url, privateKey, provider, and web3 options', () => {
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

  expect(config.services.web3).toEqual([
    'Web3Service',
    {
      statusTimerDelay: 10000,
      usePresetProvider: true,
      privateKey: '0xf00',
      provider: {
        timeout: 1000,
        type: 'HTTP',
        url: 'http://foo.net'
      }
    }
  ]);
});

test('it overwrites a service name', () => {
  const config = ConfigFactory.create('http', { exchange: 'OtherService' });
  expect(config.services.exchange).toEqual(['OtherService', {}]);
});

test('it adds service options', () => {
  const config = ConfigFactory.create('http', { exchange: { foo: 'bar' } });
  expect(config.services.exchange).toEqual([
    'OasisExchangeService',
    { foo: 'bar' }
  ]);
});

test('it passes service options for an omitted service', () => {
  const config = ConfigFactory.create('http', { cdp: { foo: 'bar' } });
  expect(config.services.cdp).toEqual({ foo: 'bar' });
});

test('it preserves the preset service name', () => {
  const preset = { services: { log: 'BunyanLogger' } };
  const config = ConfigFactory.create({ preset, log: { verbose: true } });
  expect(config.services.log).toEqual(['BunyanLogger', { verbose: true }]);
});

test('it overrides metamask when specified in options', () => {
  const firstConfig = ConfigFactory.create('kovan', { overrideMetamask: true });
  const secondConfig = ConfigFactory.create('kovan');
  const thirdConfig = ConfigFactory.create('kovan', {
    overrideMetamask: false
  });
  const firstConfigProvider =
    firstConfig.services.web3.usePresetProvider !== undefined
      ? firstConfig.services.web3.usePresetProvider
      : firstConfig.services.web3.usePresetProvider[1];
  const secondConfigProvider =
    secondConfig.services.web3.usePresetProvider !== undefined
      ? secondConfig.services.web3.usePresetProvider
      : secondConfig.services.web3.usePresetProvider[1];
  const thirdConfigProvider =
    thirdConfig.services.web3.usePresetProvider !== undefined
      ? thirdConfig.services.web3.usePresetProvider
      : thirdConfig.services.web3.usePresetProvider[1];

  expect(firstConfigProvider).toEqual(false);
  expect(secondConfigProvider).toEqual(true);
  expect(thirdConfigProvider).toEqual(true);
});
