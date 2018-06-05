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
