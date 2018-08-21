import AccountsService from '../../src/eth/AccountsService';
import { buildTestService } from '../helpers/serviceBuilders';
import TestAccountProvider from '../helpers/TestAccountProvider';
import Wallet from 'web3-provider-engine/dist/es5/subproviders/wallet';

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
  await service.manager().initialize();
  service.attachToEngine(mockEngine());
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
      await service.manager().initialize();
    } catch (err) {
      expect(err.message).toMatch(/private key/);
    }
  }
});

test('account with custom subprovider implementation', async () => {
  const service = new AccountsService();

  service.addAccountType('foo', async settings => {
    return Promise.resolve({
      address: '0xf00' + settings.suffix
    });
  });

  await service.addAccount('fakeaccount', {
    type: 'foo',
    suffix: 'bae'
  });

  service.attachToEngine(mockEngine());
  service.useAccount('fakeaccount');
  expect(service.currentAddress()).toEqual('0xf00bae');
});

test('currentAccount', async () => {
  expect.assertions(2);
  const service = new AccountsService();
  const a1 = TestAccountProvider.nextAccount();
  await service.addAccount('foo', { type: 'privateKey', key: a1.key });
  try {
    service.currentAccount();
  } catch (err) {
    expect(err.message).toMatch(/attachToEngine/);
  }
  service.useAccount('foo');
  service.attachToEngine(mockEngine());
  expect(service.currentAccount()).toEqual({
    name: 'foo',
    type: 'privateKey',
    address: a1.address
  });
});

test('listAccounts', async () => {
  const service = new AccountsService();
  const a1 = TestAccountProvider.nextAccount();
  const a2 = TestAccountProvider.nextAccount();
  await service.addAccount('foo', { type: 'privateKey', key: a1.key });
  await service.addAccount('bar', { type: 'privateKey', key: a2.key });
  expect(service.listAccounts()).toEqual([
    { name: 'foo', type: 'privateKey', address: a1.address },
    { name: 'bar', type: 'privateKey', address: a2.address }
  ]);
});

test('useAccount before engine setup', async () => {
  const service = new AccountsService();
  const a1 = TestAccountProvider.nextAccount();
  await service.addAccount('foo', { type: 'privateKey', key: a1.key });
  service.useAccount('foo');
  const engine = mockEngine();
  service.attachToEngine(engine);

  expect(engine.stop).not.toBeCalled();
  expect(engine.removeProvider).not.toBeCalled();
  expect(engine.start).toBeCalled();
  expect(engine.addProvider).toBeCalled();
  expect(service.currentAddress()).toEqual(a1.address);
});

test('useAccount after engine setup', async () => {
  const service = new AccountsService();
  const a1 = TestAccountProvider.nextAccount();
  const a2 = TestAccountProvider.nextAccount();
  await service.addAccount('foo', { type: 'privateKey', key: a1.key });
  await service.addAccount('bar', { type: 'privateKey', key: a2.key });
  const engine = mockEngine();
  service.useAccount('foo');
  service.attachToEngine(engine);
  service.useAccount('bar');

  expect(engine.stop).toBeCalled();
  expect(engine.removeProvider).toBeCalled();
  expect(engine.start).toBeCalled();
  expect(engine.addProvider).toBeCalled();
  expect(service.currentAddress()).toEqual(a2.address);
});
