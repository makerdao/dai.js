import httpPreset from '../../src/config/presets/http';
import mainPreset from '../../src/config/presets/mainnet';
import mainHttpPreset from '../../src/config/presets/mainnetHttp';
import wsPreset from '../../src/config/presets/ws';
import browserPreset from '../../src/config/presets/browser';
import kovanPreset from '../../src/config/presets/kovan';
import kovanHttpPreset from '../../src/config/presets/kovanHttp';
import ConfigFactory from '../../src/config/ConfigFactory';

test('returns a preset by name', () => {
  expect(ConfigFactory.create('http')).toEqual(httpPreset);
  expect(ConfigFactory.create('mainnet')).toEqual(mainPreset);
  expect(ConfigFactory.create('mainnet-http')).toEqual(mainHttpPreset);
  expect(ConfigFactory.create('ws')).toEqual(wsPreset);
  expect(ConfigFactory.create('browser')).toEqual(browserPreset);
  expect(ConfigFactory.create('kovan')).toEqual(kovanPreset);
  expect(ConfigFactory.create('kovan-http')).toEqual(kovanHttpPreset);
});

test('throws an error when requesting a non-existing preset', () => {
  expect(() => ConfigFactory.create('does-not-exist')).toThrow(
    'Cannot find configuration preset with name: does-not-exist'
  );
});

test('can take an options object in addition to a preset name', () => {
  const config = ConfigFactory.create('ws', { log: false });
  expect(config.log).toEqual(false);
});

test('can take an options object as first argument', () => {
  const config = ConfigFactory.create({ preset: 'ws', log: false });
  expect(config.log).toEqual(false);
});

test('it handles url, privateKey, provider, and web3 options using http', () => {
  const config = ConfigFactory.create(
    'ws',
    {
      url: 'ws://foo.net',
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
          type: 'WEBSOCKET',
          url: 'ws://foo.net'
        },
        transactionSettings: {
          gasLimit: 4000000
        }
      }
    ],
    exchange: 'OasisExchangeService'
  });
});

test('it handles url, privateKey, provider, and web3 options using websockets', () => {
  const config = ConfigFactory.create(
    'ws',
    {
      url: 'wss://foo.net',
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
          type: 'WEBSOCKET',
          url: 'wss://foo.net'
        },
        transactionSettings: {
          gasLimit: 4000000
        }
      }
    ],
    exchange: 'OasisExchangeService'
  });
});

test('it overwrites a service name', () => {
  const config = ConfigFactory.create('ws', { exchange: 'OtherService' });
  expect(config.exchange).toEqual(['OtherService', {}]);
});

test('it adds service options', () => {
  const config = ConfigFactory.create('ws', { exchange: { foo: 'bar' } });
  expect(config.exchange).toEqual(['OasisExchangeService', { foo: 'bar' }]);
});

test('it passes service options for an omitted service', () => {
  const config = ConfigFactory.create('ws', { cdp: { foo: 'bar' } });
  expect(config.cdp).toEqual({ foo: 'bar' });
});

test('it preserves the preset service name', () => {
  const preset = { log: 'BunyanLogger' };
  const config = ConfigFactory.create({ preset, log: { verbose: true } });
  expect(config.log).toEqual(['BunyanLogger', { verbose: true }]);
});

test('skip unknown service roles', () => {
  const config = ConfigFactory.create('ws', {
    foo: 'FooService'
  });
  expect(config.foo).toBeFalsy();
});

test('should capture transaction settings', () => {
  const txSettings = {
    gasPrice: 12000000000,
    gasLimit: 4000000
  };
  const config = ConfigFactory.create('ws', {
    web3: {
      transactionSettings: txSettings
    }
  });
  expect(config.web3[1].transactionSettings).toEqual(txSettings);
});

test('should capture confirmedBlockCount', () => {
  const config = ConfigFactory.create('ws', {
    web3: {
      confirmedBlockCount: 8
    }
  });
  expect(config.web3[1].confirmedBlockCount).toEqual(8);
});

test('allow new service roles if specified', () => {
  const config = ConfigFactory.create('ws', {
    additionalServices: ['foo'],
    foo: 'FooService'
  });
  expect(config.foo).toEqual('FooService');
});

test('reject invalid service roles', () => {
  expect(() => {
    ConfigFactory.create('ws', {
      additionalServices: ['url']
    });
  }).toThrow(/cannot be used as service role names/);
});
