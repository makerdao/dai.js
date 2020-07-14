import testPreset from '../../src/config/presets/test';
import ConfigFactory from '../../src/config/ConfigFactory';

test('returns a preset by name', () => {
  expect(ConfigFactory.create('test')).toEqual(testPreset);
});

test('throws an error when requesting a non-existing preset', () => {
  expect(() => ConfigFactory.create('does-not-exist')).toThrow(
    'Cannot find configuration preset with name: does-not-exist'
  );
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
        statusTimerDelay: 10000
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
        provider: {
          timeout: 1000,
          type: 'HTTP',
          url: 'http://foo.net'
        }
      }
    ]
  });
});

//TODO
test('it overwrites a service name', () => {
  const config = ConfigFactory.create('http', { allowance: 'OtherService' });
  // expect(config.allowance).toEqual(['OtherService', {}]);
  expect(config.allowance).toEqual('OtherService');
});

test('it adds service options', () => {
  const config = ConfigFactory.create('http', { allowance: { foo: 'bar' } });
  // expect(config.allowance).toEqual([true, { foo: 'bar' }]);
  expect(config.allowance).toEqual({ foo: 'bar' });
});

test('it passes service options for an omitted service', () => {
  const config = ConfigFactory.create('http', { allowance: { foo: 'bar' } });
  // expect(config.allowance).toEqual([true, { foo: 'bar' }]);
  expect(config.allowance).toEqual({ foo: 'bar' });
});

test('it preserves the preset service name', () => {
  const preset = { proxy: 'AltProxyService' };
  const config = ConfigFactory.create({ preset, proxy: { foo: true } });
  expect(config.proxy).toEqual(['AltProxyService', { foo: true }]);
});

test('skip unknown service roles', () => {
  const config = ConfigFactory.create('http', {
    foo: 'FooService'
  });
  expect(config.foo).toBeFalsy();
});

test('should capture transaction settings', () => {
  const txSettings = {
    gasPrice: 12000000000,
    gasLimit: 4000000
  };
  const config = ConfigFactory.create('http', {
    web3: {
      transactionSettings: txSettings
    }
  });
  expect(config.web3[1].transactionSettings).toEqual(txSettings);
});

test('should capture confirmedBlockCount', () => {
  const config = ConfigFactory.create('http', {
    web3: {
      confirmedBlockCount: 8
    }
  });
  expect(config.web3[1].confirmedBlockCount).toEqual(8);
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
