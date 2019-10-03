import { buildTestService } from '../helpers/serviceBuilders';
import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';
import Wallet from 'web3-provider-engine/dist/es5/subproviders/wallet';
import {
  providerAccountFactory,
  browserProviderAccountFactory
} from '../../src/eth/accounts/factories';
import RpcSource from 'web3-provider-engine/dist/es5/subproviders/rpc';
import ProviderSubprovider from 'web3-provider-engine/dist/es5/subproviders/provider';

jest.useFakeTimers();

function mockEngine(overrides = {}) {
  return {
    stop: jest.fn(),
    start: jest.fn(),
    removeProvider: jest.fn(),
    addProvider: jest.fn(),
    ...overrides
  };
}

test('account with private key string literal in settings', async () => {
  const account = TestAccountProvider.nextAccount();
  const service = buildTestService('accounts', {
    accounts: {
      foo: { type: 'privateKey', key: account.key }
    }
  });
  await service.manager().connect();
  expect(service.currentAddress()).toEqual(account.address);
  expect(service.currentWallet()).toBeInstanceOf(Wallet);
});

test('provider account with offset', async () => {
  const offset = 11;
  TestAccountProvider.setIndex(offset);
  const { address } = TestAccountProvider.nextAccount();

  const service = buildTestService('accounts', {
    accounts: {
      foo: { type: 'provider', offset }
    }
  });
  await service.manager().connect();
  expect(service.currentAddress()).toEqual(address);
});

test('provider account with address', async () => {
  const { address } = TestAccountProvider.nextAccount();
  const service = buildTestService('accounts', {
    accounts: {
      foo: { type: 'provider', address }
    }
  });
  await service.manager().connect();
  expect(service.currentAddress()).toEqual(address);
});

test('invalid private keys', async () => {
  const badKeys = [
    null,
    'quack',
    'z178ad06eb08e2cd34346b5c8ec06654d6ccb1cadf1c9dbd776afd25d44ab8d0',
    '0xz178ad06eb08e2cd34346b5c8ec06654d6ccb1cadf1c9dbd776afd25d44ab8d0'
  ];
  expect.assertions(badKeys.length);
  for (const key of badKeys) {
    const service = buildTestService('accounts', {
      accounts: {
        foo: { type: 'privateKey', key }
      }
    });
    try {
      await service.manager().connect();
    } catch (err) {
      expect(err.message).toMatch(/private key/);
    }
  }
});

test('account with custom subprovider implementation', async () => {
  const service = buildTestService('accounts', { accounts: true });
  await service.manager().connect();
  const setEngine = jest.fn();

  service.addAccountType('foo', async settings => {
    return Promise.resolve({
      address: '0xf00' + settings.suffix,
      subprovider: { setEngine, handleRequest: jest.fn() }
    });
  });

  await service.addAccount('fakeaccount', { type: 'foo', suffix: 'bae' });
  service.useAccount('fakeaccount');
  expect(service.currentAddress()).toEqual('0xf00bae');
  expect(setEngine).toBeCalled();
});

test('addAccount throws with duplicate name', async () => {
  const service = buildTestService('accounts', { accounts: true });
  await service.manager().authenticate();
  service._engine = mockEngine();
  const a1 = TestAccountProvider.nextAccount();
  const a2 = TestAccountProvider.nextAccount();
  try {
    await service.addAccount('f00', { type: 'privateKey', key: a1.key });
    await service.addAccount('f00', { type: 'privateKey', key: a2.key });
  } catch (err) {
    expect(err.message).toMatch(/An account with this name already exists/);
  }
});

test('addAccount throws with duplicate address', async () => {
  const service = buildTestService('accounts', { accounts: true });
  await service.manager().authenticate();
  service._engine = mockEngine();
  const a1 = TestAccountProvider.nextAccount();
  try {
    await service.addAccount('f00', { type: 'privateKey', key: a1.key });
    await service.addAccount('bar', { type: 'privateKey', key: a1.key });
  } catch (err) {
    expect(err.message).toMatch(/An account with this address already exists/);
  }
});

test('currentAccount', async () => {
  const service = buildTestService('accounts', { accounts: true });
  await service.manager().authenticate();
  service._engine = mockEngine();
  const a1 = TestAccountProvider.nextAccount();
  await service.addAccount('foo', { type: 'privateKey', key: a1.key });
  service.useAccount('foo');
  expect(service.currentAccount()).toEqual({
    name: 'foo',
    type: 'privateKey',
    address: a1.address
  });
});

test('listAccounts', async () => {
  const service = buildTestService('accounts', { accounts: true });
  await service.manager().authenticate();
  service._engine = mockEngine();
  const a1 = TestAccountProvider.nextAccount();
  const a2 = TestAccountProvider.nextAccount();
  await service.addAccount('foo', { type: 'privateKey', key: a1.key });
  await service.addAccount('bar', { type: 'privateKey', key: a2.key });
  expect(service.listAccounts()).toEqual([
    { name: 'default', type: 'provider', address: expect.any(String) },
    { name: 'foo', type: 'privateKey', address: a1.address },
    { name: 'bar', type: 'privateKey', address: a2.address }
  ]);
});

test('useAccount', async () => {
  const service = buildTestService('accounts', { accounts: true });
  await service.manager().authenticate();
  const engine = (service._engine = mockEngine());
  const a1 = TestAccountProvider.nextAccount();
  const a2 = TestAccountProvider.nextAccount();
  await service.addAccount('foo', { type: 'privateKey', key: a1.key });
  await service.addAccount('bar', { type: 'privateKey', key: a2.key });
  service.useAccount('foo');
  service.useAccount('bar');

  expect(engine.stop).toBeCalled();
  expect(engine.removeProvider).toBeCalled();
  expect(engine.start).toBeCalled();
  expect(engine.addProvider).toBeCalled();
  expect(service.currentAddress()).toEqual(a2.address);
});

test('useAccount throws with invalid name', async () => {
  const service = buildTestService('accounts', { accounts: true });
  await service.manager().authenticate();
  try {
    service.useAccount('f00');
  } catch (err) {
    expect(err.message).toMatch(/No account found with name/);
  }
});

test('useAccountWithAddress', async () => {
  const service = buildTestService('accounts', { accounts: true });
  await service.manager().authenticate();
  const engine = (service._engine = mockEngine());
  const a1 = TestAccountProvider.nextAccount();
  const a2 = TestAccountProvider.nextAccount();
  await service.addAccount('foo', { type: 'privateKey', key: a1.key });
  await service.addAccount('bar', { type: 'privateKey', key: a2.key });
  service.useAccount('foo');
  service.useAccountWithAddress(a2.address);

  expect(engine.stop).toBeCalled();
  expect(engine.removeProvider).toBeCalled();
  expect(engine.start).toBeCalled();
  expect(engine.addProvider).toBeCalled();
  expect(service.currentAddress()).toEqual(a2.address);
});

test('useAccount throws with invalid address', async () => {
  const service = buildTestService('accounts', { accounts: true });
  await service.manager().authenticate();
  try {
    service.useAccountWithAddress('0xf00');
  } catch (err) {
    expect(err.message).toMatch(/No account found with address/);
  }
});

test('add and use account with no name', async () => {
  const service = buildTestService('accounts', { accounts: true });
  await service.manager().authenticate();
  const engine = (service._engine = mockEngine());
  const a1 = TestAccountProvider.nextAccount();
  const a2 = TestAccountProvider.nextAccount();
  await service.addAccount('foo', { type: 'privateKey', key: a1.key });
  await service.addAccount({ type: 'privateKey', key: a2.key });
  service.useAccount('foo');
  service.useAccount(a2.address);

  expect(engine.stop).toBeCalled();
  expect(engine.removeProvider).toBeCalled();
  expect(engine.start).toBeCalled();
  expect(engine.addProvider).toBeCalled();
  expect(service.currentAddress()).toEqual(a2.address);
});

test('providerAccountFactory', async () => {
  const rpc = new RpcSource({ rpcUrl: 'http://localhost:2000' });
  const account = await providerAccountFactory({}, rpc);
  expect(account.address).toEqual('0x16fb96a5fa0427af0c8f7cf1eb4870231c8154b6');
});

describe('mocking window', () => {
  const origWindow = {};

  let mockProvider;

  beforeEach(() => {
    mockProvider = {
      sendAsync: ({ method }, callback) => {
        if (method === 'eth_accounts') {
          callback(null, {
            result: [
              window.web3 && window.web3.eth
                ? window.web3.eth.defaultAccount
                : '0xf00'
            ]
          });
        }
      }
    };
  });

  afterEach(() => {
    Object.assign(window, origWindow);
    delete window.web3;
    delete window.ethereum;
  });

  test('use wrong browser account', async () => {
    window.web3 = {
      currentProvider: mockProvider,
      eth: {
        defaultAccount: '0xf00bae'
      }
    };

    const service = buildTestService('accounts', { accounts: true });
    await service.manager().authenticate();
    service._engine = mockEngine();
    try {
      await service.addAccount('bar', { type: 'browser' });
      service.useAccount('bar');
    } catch (err) {
      expect(err.message).toBe(
        'cannot use a browser account that is not currently selected'
      );
    }
  });

  test('browser autoSwitch', async () => {
    window.web3 = {
      currentProvider: mockProvider,
      eth: {
        defaultAccount: '0xf00'
      }
    };

    const service = buildTestService('accounts', { accounts: true });
    await service.manager().authenticate();
    service._engine = mockEngine();

    await service.addAccount('foo', { type: 'browser', autoSwitch: true });
    service.useAccount('foo');
    const promise = new Promise(resolve =>
      service.get('event').on(
        'accounts/CHANGE',
        jest.fn(eventObj => {
          expect(eventObj.payload.account.address).toEqual('0xf01');
          resolve();
        })
      )
    );
    window.web3.eth.defaultAccount = '0xf01'; // this changes when a user switches accounts

    jest.advanceTimersByTime(500);
    jest.clearAllTimers();

    await promise;
    expect(service.currentAddress()).toEqual('0xf01');
  });

  test('browserProviderAccountFactory with window.web3', async () => {
    window.web3 = {
      currentProvider: mockProvider
    };

    const account = await browserProviderAccountFactory();
    expect(account.address).toEqual('0xf00');
    expect(account.subprovider).toBeInstanceOf(ProviderSubprovider);
  });

  test('browserProviderAccountFactory with window.ethereum, user accepts provider', async () => {
    window.ethereum = {
      enable: () => {
        window.ethereum['sendAsync'] = mockProvider.sendAsync;
      }
    };
    const account = await browserProviderAccountFactory();
    expect(account.address).toEqual('0xf00');
    expect(account.subprovider).toBeInstanceOf(ProviderSubprovider);
  });

  test('browserProviderAccountFactory with window.ethereum, user rejects provider', async () => {
    window.ethereum = {
      enable: async () => {
        window.ethereum['sendAsync'] = mockProvider.sendAsync;
        throw new Error('nope');
      }
    };
    expect.assertions(1);
    try {
      await browserProviderAccountFactory();
    } catch (err) {
      expect(err.message).toMatch(/nope/);
    }
  });
});
