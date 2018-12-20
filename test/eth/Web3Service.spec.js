import TestAccountProvider from '../helpers/TestAccountProvider';
import { captureConsole, observePromise, promiseWait } from '../../src/utils';
import { waitForBlocks } from '../helpers/transactionConfirmation';
import { callGanache } from '../helpers/ganache';
import {
  buildTestService as buildTestServiceCore,
  buildTestInfuraService
} from '../helpers/serviceBuilders';
import { WETH } from '../../src/eth/Currency';
import tokens from '../../contracts/tokens';
import contracts from '../../contracts/contracts';

describe.each([
  ['with http provider', true],
  ['with websocket provider', false]
])('%s', (name, useHttp) => {
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
      useHttp,
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
    return buildTestInfuraService(network, useHttp);
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

  test('detects correct network on connection', async () => {
    const testService = buildTestService();
    const kovanService = buildInfuraService('kovan');
    const mainService = buildInfuraService('mainnet');

    await Promise.all([
      testService.manager().connect(),
      kovanService.manager().connect(),
      mainService.manager().connect()
    ]);

    expect(testService.getNetwork()).toEqual(999);
    expect(kovanService.getNetwork()).toEqual(42);
    //expect(mainService.getNetwork()).toEqual(1);
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

  test('waitForBlockNumber returns promise which resolves on correct block', async () => {
    const service = buildTestServiceCore('cdp', { cdp: true });
    await service.manager().authenticate();
    const web3Service = service.get('smartContract').get('web3');

    jest.spyOn(global.console, 'error');
    await web3Service.waitForBlockNumber(web3Service.blockNumber() - 1);
    expect(console.error).toBeCalled();

    const calledWithCurrentBlock = await web3Service.waitForBlockNumber(
      web3Service._currentBlock
    );
    expect(calledWithCurrentBlock).toEqual(web3Service.blockNumber());

    const currentBlock = web3Service.blockNumber();
    await Promise.all([
      waitForBlocks(service, 1),
      web3Service.waitForBlockNumber(currentBlock + 1)
    ]);
    expect(typeof web3Service._blockListeners[currentBlock]).toBeDefined();
    expect(web3Service.blockNumber()).toEqual(currentBlock + 1);
  });

  test('trigger a callback on future block', async () => {
    expect.assertions(2);
    const service = buildTestServiceCore('cdp', { cdp: true });
    await service.manager().authenticate();
    const web3Service = service.get('smartContract').get('web3');
    const currentBlock = web3Service.blockNumber();

    expect(() => web3Service.onBlock(currentBlock - 1, null)).toThrowError(
      /cannot schedule a callback back in time/
    );

    const cb = () => {
      expect(true).toBe(true);
    };
    web3Service.onBlock(currentBlock + 1, cb);
    await waitForBlocks(service, 1);
  });

  if (!useHttp) {
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
          cdp: true
        });
        await service.manager().authenticate();

        const web3Service = service.get('smartContract').get('web3');
        const currentBlock = web3Service.blockNumber();
        await waitForBlocks(service, 1);
        expect(web3Service.blockNumber()).toEqual(currentBlock + 1);
      });

      test('removeblockUpdates will pause newBlock subscription', async () => {
        const service = buildTestService();
        await service.manager().authenticate();
        service._removeBlockUpdates();
        expect(service._blockSub._events).toEqual({});
      });

      test('unsubscribeNewBlocks will throw error', async () => {
        const service = buildTestService();
        await service.manager().authenticate();

        service._blockSub.unsubscribe = jest
          .fn()
          .mockImplementation(cb => cb('unsubscribe error', false));
        expect(() => service.unsubscribeNewBlocks()).toThrowError(
          /unsubscribe/
        );
      });

      describe('can subscribe to contract events', () => {
        let ethereumCdpService, tokenService, web3Service, smartContractService;

        beforeEach(async () => {
          ethereumCdpService = buildTestServiceCore('cdp', { cdp: true });
          await ethereumCdpService.manager().authenticate();
          tokenService = ethereumCdpService.get('token');
          web3Service = tokenService.get('web3');
          smartContractService = ethereumCdpService.get('smartContract');
        });

        test('weth: transfer', async () => {
          const weth = tokenService.getToken(WETH);
          const a1 = web3Service.currentAccount();
          const a2 = TestAccountProvider.nextAddress();
          await weth.deposit(0.1);
          const wethAbi = smartContractService._getContractInfo(tokens.WETH);

          const eventPromise = observePromise(
            web3Service.waitForMatchingEvent(wethAbi, 'Transfer')
          );

          expect(eventPromise.isSettled()).toEqual(false);
          await weth.transfer(a2, '0.1');
          await promiseWait(100); // let transfer trigger the eventPromise to resolve rather than waiting on it

          expect(eventPromise.isSettled()).toEqual(true);
          expect(eventPromise.isResolved()).toEqual(true);

          const log = await eventPromise;
          expect(log.src.toLowerCase()).toEqual(a1);
          expect(log.dst.toLowerCase()).toEqual(a2);
          expect(log.wad).toEqual('100000000000000000');
        });

        test('weth: transfer with predicate', async () => {
          const weth = tokenService.getToken(WETH);
          const a1 = web3Service.currentAccount();
          const a2 = TestAccountProvider.nextAddress();
          const a3 = TestAccountProvider.nextAddress();
          await weth.deposit(0.2);
          const wethAbi = smartContractService._getContractInfo(tokens.WETH);

          const eventPromise = observePromise(
            web3Service.waitForMatchingEvent(wethAbi, 'Transfer', log => {
              return log.dst.toLowerCase() === a3;
            })
          );

          expect(eventPromise.isSettled()).toEqual(false);
          await weth.transfer(a2, '0.1');
          expect(eventPromise.isSettled()).toEqual(false);

          await weth.transfer(a3, '0.1');
          await promiseWait(100);

          expect(eventPromise.isSettled()).toEqual(true);
          expect(eventPromise.isResolved()).toEqual(true);

          const log = await eventPromise;
          expect(log.src.toLowerCase()).toEqual(a1);
          expect(log.dst.toLowerCase()).toEqual(a3);
          expect(log.wad).toEqual('100000000000000000');
        });

        test('dsNote: LogNote', async () => {
          const tubAbi = smartContractService._getContractInfo(
            contracts.SAI_TUB
          );

          const eventPromise = observePromise(
            web3Service.waitForMatchingEvent(tubAbi, 'LogNote')
          );
          expect(eventPromise.isSettled()).toEqual(false);
          await ethereumCdpService.openCdp();
          await promiseWait(100);

          expect(eventPromise.isSettled()).toEqual(true);
          expect(eventPromise.isResolved()).toEqual(true);

          const log = await eventPromise;
          expect(Object.keys(log).splice(7)).toEqual([
            'sig',
            'guy',
            'foo',
            'bar',
            'wad',
            'fax'
          ]);
        });
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

      test('will poll to check for block updates', async () => {
        const service = buildTestService();
        await service.manager().authenticate();
        const blockNumber = service.blockNumber();

        // 'evm_mine' forces ganache to mine a single block. This is used so the services are seperate
        // to altering ganache state
        callGanache('evm_mine');

        await service.waitForBlockNumber(blockNumber + 1);
        expect(service.blockNumber()).toEqual(blockNumber + 1);
      });

      test('will iterate through missed blocks', async () => {
        expect.assertions(10);
        const service = buildTestService();
        await service.manager().authenticate();
        const blockNumber = service.blockNumber();

        const check = (expected, actual) => {
          expect(expected).toEqual(actual);
        };
        for (let i = 1; i <= 10; i++) {
          service.onBlock(blockNumber + i, () => {
            check(blockNumber + i, service.blockNumber());
          });
          callGanache('evm_mine');
        }
        await service.waitForBlockNumber(blockNumber + 10);
      });

      test('removeblockUpdates will stop service polling', async () => {
        const service = buildTestService();
        await service.manager().authenticate();
        const blockNumber = service.blockNumber();

        callGanache('evm_mine');
        await service.waitForBlockNumber(blockNumber + 1);
        expect(service.blockNumber()).toEqual(blockNumber + 1);

        service._removeBlockUpdates();
        callGanache('evm_mine');
        await promiseWait(100); // service polls 50 ms so wait 100 to be sure it doesn't update
        expect(service.blockNumber()).toEqual(blockNumber + 1);
      });
    });
  }
});
