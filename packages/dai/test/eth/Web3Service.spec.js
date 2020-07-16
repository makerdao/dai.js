import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';
import ProviderType from '../../src/eth/web3/ProviderType';
import { buildTestService as buildTestServiceCore } from '../helpers/serviceBuilders';
import { infuraProjectId } from '../helpers/serviceBuilders';

function buildTestService(key, statusTimerDelay = 5000) {
  const config = {
    web3: {
      statusTimerDelay,
      transactionSettings: {
        gasPrice: 1
      }
    }
  };
  if (key) {
    config.accounts = {
      default: { type: 'privateKey', key }
    };
  }
  return buildTestServiceCore('web3', config);
}

function buildInfuraService(network, privateKey = null) {
  return buildTestServiceCore('web3', {
    web3: {
      privateKey,
      provider: {
        type: ProviderType.INFURA,
        network,
        infuraProjectId
      },
      transactionSettings: {
        gasLimit: 4000000
      }
    }
  });
}

test('throw error on a failure to connect', async () => {
  expect.assertions(1);
  const service = buildTestService();
  await service.manager().initialize();
  service._web3.eth.net.getId = cb => {
    cb(new Error('fake connection failure error'));
  };

  try {
    await service.manager().connect();
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }
});

test('be authenticated and know default address when private key passed in', done => {
  const service = buildTestService(
    '0xa69d30145491b4c1d55e52453cabb2e73a9daff6326078d49376449614d2f700'
  );

  service
    .manager()
    .authenticate()
    .then(() => {
      expect(service.manager().isAuthenticated()).toBe(true);
      expect(service.currentAddress()).toBe(
        '0x717bc9648b627316718fe93f4cd98056e53a8c8d'
      );
      done();
    });
});

test('connect to ganache testnet with account 0x16fb9...', done => {
  const service = buildTestService(),
    expectedAccounts = [
      '0x16fb96a5fa0427af0c8f7cf1eb4870231c8154b6',
      '0x81431b69b1e0e334d4161a13c2955e0f3599381e'
    ];

  service
    .manager()
    .connect()
    .then(() => service.getAccounts())
    .then(accounts => {
      expect(accounts[0].toLowerCase()).toEqual(expectedAccounts[0]);
      expect(accounts[1].toLowerCase()).toEqual(expectedAccounts[1]);
      done();
    })
    .catch(console.error);
});

test('have ETH in test account', done => {
  const service = buildTestService();

  service
    .manager()
    .connect()
    .then(() => service.getBalance(TestAccountProvider.nextAddress()))
    .then(balance => {
      expect(Number(service._web3.utils.fromWei(balance))).toBeGreaterThan(50);
      done();
    });
});

test('connect to kovan', async () => {
  const service = buildInfuraService('kovan');
  try {
    await service.manager().connect();
  } catch (err) {
    console.log(err);
  }
  expect(service.manager().isConnected()).toBe(true);
  expect(service.network).toBe(42);
});

test('stores transaction settings from config', async () => {
  const service = buildTestService();
  await service.manager().authenticate();
  const settings = service.transactionSettings();
  expect(settings).toEqual({ gasPrice: 1 });
});

test('stores confirmed block count from config', async () => {
  const config = {
    web3: { confirmedBlockCount: 8 }
  };
  const service = buildTestServiceCore('web3', config);
  await service.manager().authenticate();
  const count = service.confirmedBlockCount();
  expect(count).toEqual(8);
});

test('sets default confirmed block count', async () => {
  const service = buildTestService();
  await service.manager().authenticate();
  const count = service.confirmedBlockCount();
  expect(count).toEqual(5);
});
