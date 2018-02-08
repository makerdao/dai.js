/*eslint no-console: ['error', { 'allow': ['error'] }] */

import Web3Service from './Web3Service';
import NullLoggerService from '../loggers/NullLogger/NullLoggerService';
import Web3 from 'web3';

test('should fetch version info on connect', (done) => {
  const
    log = new NullLoggerService(),
    web3 = new Web3Service();

  web3.manager().inject('log', log).connect().then(() => {
    expect(web3.version().api).toMatch(/^([0-9]+\.)*[0-9]+$/);
    expect(web3.version().node).toMatch(/^(Parity)|(MetaMask)$/);
    expect(web3.version().network).toMatch(/^[0-9]+$/);
    expect(web3.version().ethereum).toMatch(/^[0-9]+$/);
    done();
  });
});

test('should correctly use web3 provider of a previously injected web3 object, or use default', (done) => {
  const
    log = new NullLoggerService(),
    web3 = new Web3(),
    service = new Web3Service(),
    service2 = new Web3Service();

  service.manager().inject('log', log).initialize()
    .then(() => {
      expect(service._web3.currentProvider).toBeInstanceOf(Web3.providers.HttpProvider);
    })
    .then(() => {
      window.web3 = web3;
      return service2.manager().inject('log', log).initialize();
    })
    .then(() => {
      expect(service2._web3.currentProvider).toBe(window.web3.currentProvider);
      delete window.web3;
      done();
    });
});

test('should return error reason on a failure to connect', (done) => {
  const
    log = new NullLoggerService(),
    service = new Web3Service();

  let error = false;
  log.error = (msg) => {
    error = msg;
  };

  service.manager().inject('log', log).initialize()
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
    },
    reason => {
      console.error(reason);
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
*/

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

