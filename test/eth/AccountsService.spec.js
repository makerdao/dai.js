import { buildTestService } from '../helpers/serviceBuilders';
import TestAccountProvider from '../helpers/TestAccountProvider';
import Wallet from 'web3-provider-engine/dist/es5/subproviders/wallet';

test('account with private key string literal', async () => {
  const account = TestAccountProvider.nextAccount();
  const service = buildTestService('accounts', {
    accounts: {
      foo: { type: 'privateKey', key: account.key }
    }
  });
  await service.manager().initialize();
  expect(service.currentAddress()).toEqual(account.address);
  expect(service.getWallet()).toBeInstanceOf(Wallet);
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
  const service = buildTestService('accounts', {
    accounts: true
  });
  await service.manager().initialize();

  service.addAccountType('foo', async settings => {
    return Promise.resolve({
      address: '0xf00' + settings.suffix
    });
  });

  await service.addAccount('fakeaccount', {
    type: 'foo',
    suffix: 'bae'
  });

  service.useAccount('fakeaccount');

  expect(service.currentAddress()).toEqual('0xf00bae');
});
