/*eslint no-console: ['error', { 'allow': ['error'] }] */

import Web3Service from '../web3/Web3Service';

test('should fetch version info on connect', (done) => {
  const web3 = Web3Service.buildTestService();

  web3.manager().connect().then(() => {
    expect(web3.version().api).toMatch(/^([0-9]+\.)*[0-9]+$/);
    expect(web3.version().node).toMatch(/^(Parity)|(MetaMask)|(EthereumJS.*)$/);
    expect(web3.version().network).toMatch(/^[0-9]+$/);
    expect(web3.version().ethereum).toMatch(/^[0-9]+$/);
    done();
  });
});

test('should correctly use web3 provider of a previously injected web3 object, or use default', (done) => {
  const
    web3 = Web3Service.buildTestService(),
    service = Web3Service.buildTestService(),
    service2 = Web3Service.buildTestService();

  service.manager().initialize()
    .then(() => {
      expect(service._web3.currentProvider.engine).toBeDefined();
    })
    .then(() => {
      window.web3 = web3;
      return service2.manager().initialize();
    })
    .then(() => {
      expect(service2._web3.currentProvider).toBe(window.web3.currentProvider);

      window.web3 = undefined;
      delete window.web3;
      done();
    });
});

test('should return error reason on a failure to connect', (done) => {
  const service = Web3Service.buildTestService();

  let error = false;
  service.get('log').error = (msg) => {
    error = msg;
  };

  service.manager().initialize()
    .then(() => {
      service._web3.version.getNode = () => {
        error = true;
        throw new Error('connection failed');
      };
      return service.manager().connect();
    })
    .then(() => {
      expect(error).toBeInstanceOf(Error);
      done();
    });
});

test('should correctly handle automatic disconnect', (done) => {
  const service = Web3Service.buildDisconnectingService();
  service.manager().onDisconnected(()=>{
    expect(service.manager().isConnected()).toBe(false);
    done();
  });
  service.manager().connect();
});

test('should correctly handle automatic change of network as a disconnect', (done) => {
  const service = Web3Service.buildNetworkChangingService();
  service.manager().onDisconnected(()=>{
    expect(service.manager().isConnected()).toBe(false);
    done();
  });
  service.manager().connect();
});

//this test needs to be commented out in order to push it to git and have it pass the tests
//need to run this test individually and then disconnect the wifi for it to pass
/*
test('should correctly handle a manual disconnect', (done) => {
  const service = Web3Service.buildRemoteService();
  service.manager().onDisconnected(()=>{
    expect(service.manager().isConnected()).toBe(false);
    done();
  });
  service.manager().connect();
});
*/

test('should correctly handle automatic deauthentication', (done) => {
  const service = Web3Service.buildDeauthenticatingService();
  service.manager().onDeauthenticated(()=>{
    expect(service.manager().isAuthenticated()).toBe(false);
    done();
  });
  service.manager().authenticate();
});


test('should correctly handle automatic change of account as a deauthenticate', (done) => {
  const service = Web3Service.buildAccountChangingService();
  service.manager().onDeauthenticated(()=>{
    expect(service.manager().isAuthenticated()).toBe(false);
    done();
  });
  service.manager().authenticate();
});

test('should create a ethersjs object running parallel to web3', (done) => {
  const service = Web3Service.buildEthersService();
  service.manager().connect()
    .then(() => {
      console.log(service._web3.currentProvider);
      expect(service._ethersProvider).toBeDefined();
      expect(service._web3.currentProvider).toBe(service._ethersProvider);
      done();
    });
});
    


/*
test('should connect to ganache testnet with account 0x16fb9...', (done) => {
  const
    expectedAccounts = [
      '0x16fb96a5fa0427af0c8f7cf1eb4870231c8154b6',
      '0x81431b69b1e0e334d4161a13c2955e0f3599381e'
    ],
    service = Web3Service.buildTestService(); //injects log

  service.manager().initialize()
    .then(() => {
      return service.eth.getAccounts();
    })
    .then((accounts) => {
      expect(accounts).toEqual(expectedAccounts);
      done();
    })
    .catch(console.error);
});

/* test('should throw an error when authenticating if no active account', (done) => {
  const
    log = new NullLoggerService(),
    service = new Web3Service();

  service.manager().inject('log', log).authenticate().then(data => {
  expect(service.manager().state()).toBe(ServiceState.ONLINE);
  done();
  });
});
*/