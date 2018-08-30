import TestAccountProvider from '../helpers/TestAccountProvider';
import ProviderType from '../../src/eth/web3/ProviderType';
import { captureConsole } from '../../src/utils';
import { buildTestService as buildTestServiceCore } from '../helpers/serviceBuilders';

function buildDisconnectingService(disconnectAfter = 25) {
  const service = buildTestService(null, disconnectAfter + 25);

  service.manager().onConnected(() => {
    service
      .get('timer')
      .createTimer('disconnect', disconnectAfter, false, () => {
        service._web3.version.getNetwork = () => {
          throw new Error('fake disconnection error');
        };
      });
  });

  return service;
}

function buildNetworkChangingService(changeNetworkAfter = 25) {
  const service = buildTestService(null, changeNetworkAfter + 25);
  service.manager().onConnected(() => {
    service
      .get('timer')
      .createTimer('changeNetwork', changeNetworkAfter, false, () => {
        service._web3.version.getNetwork = cb => cb(undefined, 999); //fake network id
      });
  });
  return service;
}

function buildDeauthenticatingService(deauthenticateAfter = 25) {
  const service = buildTestService(null, deauthenticateAfter + 25);

  service.manager().onAuthenticated(() => {
    service
      .get('timer')
      .createTimer('deauthenticate', deauthenticateAfter, false, () => {
        service._web3.eth.getAccounts = cb => cb(undefined, []);
      });
  });
  return service;
}

function buildAccountChangingService(changeAccountAfter = 25) {
  const service = buildTestService(null, changeAccountAfter + 25);
  service.manager().onAuthenticated(() => {
    service
      .get('timer')
      .createTimer('changeAccount', changeAccountAfter, false, () => {
        service._web3.eth.getAccounts = cb => cb(undefined, ['0x123456789']); //fake account
      });
  });
  return service;
}

function buildTestService(key, statusTimerDelay = 5000) {
  const config = {
    web3: {
      statusTimerDelay,
      provider: { type: ProviderType.TEST }
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
        infuraApiKey: process.env.INFURA_API_KEY
      },
      transactionSettings: {
        gasLimit: 4000000
      }
    }
  });
}

test('fetch version info on connect', done => {
  const web3 = buildTestService();

  web3
    .manager()
    .connect()
    .then(() => {
      expect(web3.version().api).toMatch(/^([0-9]+\.)*[0-9]+$/);
      expect(web3.version().node).toMatch(
        /^(Parity)|(MetaMask)|(EthereumJS.*)$/
      );
      expect(web3.version().network).toMatch(/^[0-9]+$/);
      expect(web3.version().ethereum).toMatch(/^[0-9]+$/);
      done();
    });
});

test('throw error on a failure to connect', async () => {
  expect.assertions(1);
  const service = buildTestService();
  await service.manager().initialize();
  service._web3.version.getNode = cb => {
    cb(new Error('fake connection failure error'));
  };

  try {
    await service.manager().connect();
    console.log(service._info);
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
      expect(service.currentAccount()).toBe(
        '0x717bc9648b627316718fe93f4cd98056e53a8c8d'
      );
      done();
    });
});

test('handle automatic disconnect', done => {
  captureConsole(() => {
    const service = buildDisconnectingService();

    service.manager().onDisconnected(() => {
      expect(service.manager().isConnected()).toBe(false);
      done();
    });

    service.manager().connect();
  });
});

test('handle automatic change of network as a disconnect', done => {
  const service = buildNetworkChangingService();
  service.manager().onDisconnected(() => {
    expect(service.manager().isConnected()).toBe(false);
    done();
  });
  service.manager().connect();
});

//this test needs to be commented out in order to push it to git and have it pass the tests
//need to run this test individually and then disconnect the wifi for it to pass
/*
test('handle a manual disconnect', (done) => {
  const service = Web3Service.buildRemoteService();
  service.manager().onDisconnected(()=>{
    expect(service.manager().isConnected()).toBe(false);
    done();
  });
  service.manager().connect();
});
*/

test('handle automatic deauthentication', async done => {
  const service = buildDeauthenticatingService();
  service.manager().onDeauthenticated(() => {
    expect(service.manager().isAuthenticated()).toBe(false);
    done();
  });
  await service.manager().authenticate();
});

test('handle automatic change of account as a deauthenticate', async done => {
  const service = buildAccountChangingService();
  service.manager().onDeauthenticated(() => {
    expect(service.manager().isAuthenticated()).toBe(false);
    done();
  });
  await service.manager().authenticate();
});

test('create a ethersjs object running parallel to web3', done => {
  const service = buildTestService();
  service
    .manager()
    .connect()
    .then(() => {
      expect(service._ethersProvider).toBeDefined();
      expect(service._web3.currentProvider).toBe(
        service._ethersProvider._web3Provider
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
    .then(() => service.eth.getAccounts())
    .then(accounts => {
      expect(accounts.slice(0, 2)).toEqual(expectedAccounts);
      done();
    })
    .catch(console.error);
});

test('have ETH in test account', done => {
  const service = buildTestService();

  service
    .manager()
    .connect()
    .then(() => service.eth.getBalance(TestAccountProvider.nextAddress()))
    .then(balance => {
      expect(Number(service._web3.fromWei(balance))).toBeGreaterThan(50);
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
  expect(service.networkId()).toBe(42);
});
