import ZeroExExchangeService from '../../../src/exchanges/zeroEx/ZeroExExchangeService';
// import Web3Service from '../../../src/eth/Web3Service';
import tokens from '../../../contracts/tokens';
// import testAccountProvider from '../../../src/utils/TestAccountProvider';
// import orderStyle from '../../../src/exchanges/orderStyle';
import TransactionState from '../../../src/eth/TransactionState';
import contracts from '../../../contracts/contracts';
const utils = require('ethers').utils;
import Web3ServiceList from '../../../src/utils/Web3ServiceList';

afterEach(() => {
  Web3ServiceList.disconnectAll();
});

test('should correctly initialize', done => {
  const apiEndpoint = 'https://api.kovan.radarrelay.com/0x/v0';
  const service = ZeroExExchangeService.buildKovanService(apiEndpoint);
  service.manager().initialize().then(()=>{
    expect(service._relayerClient._apiEndpointUrl).toBe(apiEndpoint);
    done();
  });
});

test('should correctly connect', done => {
  const apiEndpoint = 'https://api.kovan.radarrelay.com/0x/v0';
  const service = ZeroExExchangeService.buildKovanService(apiEndpoint);
  service.manager().connect().then(()=>{
    expect(service._firstOrder.orderHash.length).toBe(66);
    done();
  });
});

test('should correctly authenticate', done => {
  const apiEndpoint = 'https://api.kovan.radarrelay.com/0x/v0';
  const service = ZeroExExchangeService.buildKovanService(apiEndpoint);
  service.manager().authenticate().then(()=>{
    expect(service._availableAddress.length).toBe(42);
    done();
  });
},10000);


test('get fees sell Dai - kovan', (done) => {
  const apiEndpoint = 'https://api.kovan.radarrelay.com/0x/v0';
  const zeroExExchangeService = ZeroExExchangeService.buildKovanService(apiEndpoint);
  zeroExExchangeService.manager().authenticate()
    .then(() => {
      zeroExExchangeService.sellDai('0.01', tokens.WETH)
      .then(result => {
        console.log('result', result);
      });
      done();
    });
},
10000
);
