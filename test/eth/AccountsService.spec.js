import AccountsService from '../../src/eth/AccountsService';
import { buildTestService } from '../helpers/serviceBuilders';
import TestAccountProvider from '../helpers/TestAccountProvider';
import Wallet from 'web3-provider-engine/dist/es5/subproviders/wallet';
import {
  providerAccountFactory,
  browserProviderAccountFactory
} from '../../src/eth/accounts/factories';
import RpcSource from 'web3-provider-engine/dist/es5/subproviders/rpc';
import ProviderSubprovider from 'web3-provider-engine/dist/es5/subproviders/provider';

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
  const service = buildTestService('accounts', {
    accounts: true,
    web3: { provider: { type: 'TEST' } }
  });
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

test('currentAccount', async () => {
  const service = new AccountsService();
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
  const service = new AccountsService();
  service._engine = mockEngine();
  const a1 = TestAccountProvider.nextAccount();
  const a2 = TestAccountProvider.nextAccount();
  await service.addAccount('foo', { type: 'privateKey', key: a1.key });
  await service.addAccount('bar', { type: 'privateKey', key: a2.key });
  expect(service.listAccounts()).toEqual([
    { name: 'foo', type: 'privateKey', address: a1.address },
    { name: 'bar', type: 'privateKey', address: a2.address }
  ]);
});

test('useAccount', async () => {
  const service = new AccountsService();
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

test('providerAccountFactory', async () => {
  const rpc = new RpcSource({ rpcUrl: 'http://localhost:2000' });
  const account = await providerAccountFactory(null, rpc);
  expect(account.address).toEqual('0x16fb96a5fa0427af0c8f7cf1eb4870231c8154b6');
});

describe('mocking window', () => {
  const origWindow = {};

  let mockProvider;

  beforeAll(() => {
    // preserve the original versions of the methods that we will overwrite
    // with mocks during tests
    const { postMessage, addEventListener } = window;
    Object.assign(origWindow, { postMessage, addEventListener });
  });

  beforeEach(() => {
    mockProvider = {
      sendAsync: ({ method }, callback) => {
        if (method === 'eth_accounts') {
          callback(null, { result: ['0xf00'] });
        }
      }
    };
  });

  afterEach(() => {
    Object.assign(window, origWindow);
    delete window.web3;
    delete window.ethereum;
  });

  test('browserProviderAccountFactory with window.web3', async () => {
    window.web3 = {
      currentProvider: mockProvider
    };

    const account = await browserProviderAccountFactory();
    expect(account.address).toEqual('0xf00');
    expect(account.subprovider).toBeInstanceOf(ProviderSubprovider);
  });

  test('browserProviderAccountFactory with postMessage', async () => {
    window.postMessage = jest.fn((...args) => {
      expect(args[0]).toEqual({ type: 'ETHEREUM_PROVIDER_REQUEST' });
      expect(args[1]).toEqual('*');
      window.ethereum = mockProvider;
      document.dispatchEvent(
        new window.MessageEvent('message', {
          bubbles: true,
          data: {
            type: 'ETHEREUM_PROVIDER_SUCCESS'
          }
        })
      );
    });

    const account = await browserProviderAccountFactory();
    expect(account.address).toEqual('0xf00');
    expect(account.subprovider).toBeInstanceOf(ProviderSubprovider);
  });
});
