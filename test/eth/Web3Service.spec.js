import TestAccountProvider from '../helpers/TestAccountProvider';
import ProviderType from '../../src/eth/web3/ProviderType';
import { captureConsole } from '../../src/utils';
import { waitForBlocks } from '../helpers/transactionConfirmation';
import { buildTestService as buildTestServiceCore } from '../helpers/serviceBuilders';

describe.each([
  ['with websocket provider', true],
  ['with http provider', false]
])('%s', (name, useWebsockets) => {
  function buildDisconnectingService(disconnectAfter = 25) {
    const service = buildTestService(null, disconnectAfter + 25);

    service.manager().onConnected(() => {
      service
        .get('timer')
        .createTimer('disconnect', disconnectAfter, false, () => {
          service._web3.eth.net.getId = () => {
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
          service._info.network = cb => cb(undefined, 999); //fake network id
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

  function buildTestService(keys, statusTimerDelay = 5000) {
    const config = {
      web3: {
        statusTimerDelay,
        transactionSettings: {
          gasPrice: 1
        }
      },
      useWebsockets,
      accounts: {}
    };
    if (keys && keys.length) {
      if (keys.length === 1) {
        config.accounts['default'] = { type: 'privateKey', key: keys[0] };
      } else {
        for (let i = 0; i < keys.length; i++) {
          config.accounts[i] = { type: 'privateKey', key: keys[i] };
        }
      }
    }
    return buildTestServiceCore('web3', config);
  }

  function buildInfuraService(network) {
    const config = useWebsockets
      ? {
          web3: {
            provider: {
              url: `wss://${network}.infura.io/ws`
            }
          },
          useWebsockets
        }
      : {
          web3: {
            provider: {
              type: ProviderType.INFURA,
              network
            }
          }
        };
    return buildTestServiceCore('web3', config);
  }

  test('fetch version info on connect', done => {
    const web3 = buildTestService();

    web3
      .manager()
      .connect()
      .then(() => {
        expect(web3.info().api).toMatch(
          /^([0-9]+\.)*[0-9]([-][b][e][t][a][.]([0-9])*)*$/
        );
        expect(web3.info().node).toMatch(
          /^(Parity)|(MetaMask)|(EthereumJS.*)$/
        );
        expect(web3.info().network.toString()).toMatch(/^[0-9]+$/);
        expect(web3.info().ethereum).toMatch(/^[0-9]+$/);
        done();
      });
  });

  test('throw error on a failure to connect', async () => {
    expect.assertions(1);
    const service = buildTestService();
    await service.manager().initialize();
    service._web3.eth.getNodeInfo = cb => {
      cb(new Error('fake connection failure error'));
    };

    try {
      await service.manager().connect();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
    }
  });

  test('be authenticated and know default address when private key passed in', done => {
    const service = buildTestService([
      '0xa69d30145491b4c1d55e52453cabb2e73a9daff6326078d49376449614d2f700'
    ]);

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

  test('determine correct connection status', async done => {
    const service = buildTestService();

    expect(await service._isStillConnected()).toBe(false);
    await service.manager().connect();
    expect(await service._isStillConnected()).toBe(true);

    service.manager().onDisconnected(async () => {
      expect(await service._isStillConnected()).toBe(false);
      done();
    });

    service.get('timer').createTimer('disconnect', 25, false, () => {
      service._web3.eth.net.getId = () => {
        throw new Error('fake disconnection error');
      };
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

  test('connect to ganache testnet with account 0x16fb9...', done => {
    const service = buildTestService([
        '0x474beb999fed1b3af2ea048f963833c686a0fba05f5724cb6417cf3b8ee9697e',
        '0xb3ae65f191aac33f3e3f662b8411cabf14f91f2b48cf338151d6021ea1c08541'
      ]),
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
        expect(Number(service._web3.utils.fromWei(balance))).toBeGreaterThan(
          50
        );
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

  test('stores transaction settings from config', async () => {
    const service = buildTestService();
    await service.manager().authenticate();
    const settings = service.transactionSettings();
    expect(settings).toEqual({ gasLimit: 4000000, gasPrice: 1 });
  });

  test('stores confirmed block count from config', async () => {
    const config = {
      web3: {
        confirmedBlockCount: 8
      }
    };
    const service = buildTestServiceCore('web3', config);
    await service.manager().authenticate();
    const count = service.confirmedBlockCount();
    expect(count).toEqual(8);
  });

  test('sets default confirmed block count', async () => {
    const service = buildTestServiceCore('web3', {});
    await service.manager().authenticate();
    const count = service.confirmedBlockCount();
    expect(count).toEqual(5);
  });

  if (useWebsockets) {
    describe('when provider is using websockets', () => {
      test('should return true if using websockets', async () => {
        const service = buildTestService();
        await service.manager().authenticate();
        expect(service.usingWebsockets()).toBe(true);
      });

      test('returns correct ethers signer', async () => {
        const service = buildTestService();
        await service.manager().authenticate();
        const signer = service.getEthersSigner();

        expect(Object.keys(signer)).toEqual([
          'getAddress',
          'estimateGas',
          'sendTransaction',
          'provider'
        ]);
      });

      test('will use subscriptions to track blocks', async () => {
        const service = buildTestService();
        await service.manager().initialize();

        expect(service._blockSub.constructor.name).toEqual('Subscription');
        expect(service._blockSub.subscriptionMethod).toEqual('newHeads');
      });

      test('will unsubscribe from subscriptions to track blocks', async () => {
        const service = buildTestService();
        expect(() => service.unsubscribeNewBlocks()).toThrow();

        await service.manager().initialize();
        service.unsubscribeNewBlocks();
        expect(service._blockSub._events).toEqual({});
      });

      test('will listen and update new blocks using subscription', async () => {
        // using cdp so access to both token and web3 services is supported
        const service = buildTestServiceCore('cdp', {
          cdp: true,
          useWebsockets
        });
        await service.manager().authenticate();

        const web3Service = service.get('smartContract').get('web3');
        const currentBlock = web3Service.blockNumber();
        await waitForBlocks(service, 1);
        expect(web3Service.blockNumber()).toEqual(currentBlock + 1);
      });
    });
  } else {
    describe('when provider is using http', () => {
      test('should return false if using websockets', async () => {
        const service = buildTestService();
        await service.manager().authenticate();
        expect(service.usingWebsockets()).toBe(false);
      });

      test('returns correct ethers signer', async () => {
        const service = buildTestService();
        await service.manager().authenticate();
        const signer = service.getEthersSigner();

        expect(Object.keys(signer)).toEqual([
          'provider',
          'address',
          '_syncAddress'
        ]);
      });
    });
  }
});
