import decentralizedOasisWithoutProxies from '../../src/utils/configs/decentralized-oasis-without-proxies';
import ConfigFactory from '../../src/utils/ConfigFactory';

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
  expect(config.services.log).toEqual('NullLogger');
});

test('can take an options object as first argument', () => {
  const config = ConfigFactory.create({ preset: 'test', log: false });
  expect(config.global.enableProxies).toEqual(false);
  expect(config.services.log).toEqual('NullLogger');
});

test('it merges url, privateKey, provider, and web3 options', () => {
  const config = ConfigFactory.create('http', {
    url: 'http://foo.net',
    privateKey: '0xf00',
    provider: {
      type: 'INFURA'
    },
    web3: {
      statusTimerDelay: 10000,
      usePresetProvider: true
    }
  });

  expect(config.services.web3).toEqual([
    'Web3Service',
    {
      statusTimerDelay: 10000,
      usePresetProvider: true,
      privateKey: '0xf00',
      provider: {
        type: 'INFURA',
        url: 'http://foo.net'
      }
    }
  ]);
});

test('it overwrites a service name', () => {
  const config = ConfigFactory.create('http', { cdp: 'OtherService' });
  expect(config.services.cdp).toEqual('OtherService');
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
