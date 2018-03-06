import decentralizedOasisWithoutProxies from '../configs/decentralized-oasis-without-proxies';
import ConfigFactory from '../ConfigFactory';

test('should return a preset by name', () => {
  expect(ConfigFactory.create('decentralized-oasis-without-proxies')).toEqual(decentralizedOasisWithoutProxies);
});

test('should throw an error when requesting a non-existing preset', () => {
  expect(() => ConfigFactory.create('does-not-exist'))
    .toThrow('Cannot find configuration preset with name: does-not-exist');
});
