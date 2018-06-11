import { buildTestService } from '../../helpers/serviceBuilders';
import Web3ProviderType from '../../../src/eth/Web3ProviderType';
// import Web3Service from '../../../src/eth/Web3Service';
import tokens from '../../../contracts/tokens';
// import testAccountProvider from '../../../src/utils/TestAccountProvider';
// import orderStyle from '../../../src/exchanges/orderStyle';
// import TransactionState from '../../../src/eth/TransactionState';
// import contracts from '../../../contracts/contracts';
// const utils = require('ethers').utils;
import Web3ServiceList from '../../../src/utils/Web3ServiceList';

afterEach(() => {
  Web3ServiceList.disconnectAll();
});

function buildKovanService(relayerApi) {
  return buildTestService('exchange', {
    exchange: ['ZeroExExchangeService', { relayerApi }],
    web3: {
      usePresetProvider: false,
      privateKey:
        '0xa69d30145491b4c1d55e52453cabb2e73a9daff6326078d49376449614d2f700',
      provider: {
        type: Web3ProviderType.INFURA,
        network: 'kovan',
        infuraApiKey: 'ihagQOzC3mkRXYuCivDN'
      }
    },
    log: false
  });
}

test('should correctly initialize', done => {
  const apiEndpoint = 'https://api.kovan.radarrelay.com/0x/v0';
  const service = buildKovanService(apiEndpoint);
  service
    .manager()
    .initialize()
    .then(() => {
      expect(service._relayerClient._apiEndpointUrl).toBe(apiEndpoint);
      done();
    });
});

test(
  'should correctly connect',
  done => {
    const apiEndpoint = 'https://api.kovan.radarrelay.com/0x/v0';
    const service = buildKovanService(apiEndpoint);
    service
      .manager()
      .connect()
      .then(() => {
        expect(service._firstOrder.orderHash.length).toBe(66);
        done();
      });
  },
  30000
);

test(
  'should correctly authenticate',
  done => {
    const apiEndpoint = 'https://api.kovan.radarrelay.com/0x/v0';
    const service = buildKovanService(apiEndpoint);
    service
      .manager()
      .authenticate()
      .then(() => {
        expect(service._availableAddress.length).toBe(42);
        done();
      });
  },
  30000
);

xtest(
  'get fees sell Dai - kovan',
  done => {
    const apiEndpoint = 'https://api.kovan.radarrelay.com/0x/v0';
    const zeroExExchangeService = buildKovanService(apiEndpoint);
    zeroExExchangeService
      .manager()
      .authenticate()
      .then(() => zeroExExchangeService.sellDai('0.01', tokens.WETH))
      .then(() => done());
  },
  10000
);
