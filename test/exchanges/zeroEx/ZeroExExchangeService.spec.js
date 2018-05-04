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
  const apiEndpoint = 'https://api.radarrelay.com/0x/v0';
  const service = ZeroExExchangeService.buildKovanService(apiEndpoint);
  service.manager().initialize().then(()=>{
    expect(service._relayerClient._apiEndpointUrl).toBe(apiEndpoint);
    done();
  });
});

/*
test('get fees sell Dai - kovan', (done) => {
  const zeroExExchangeService = ZeroExExchangeService.buildKovanService();
  let oasisOrder = null;
  zeroExExchangeService.manager().authenticate()
    .then(() => {
      zeroExExchangeService.sellDai('0.01', tokens.WETH)
      done();
    });
},
30000
);
*/