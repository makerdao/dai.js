import OasisExchangeService from '../../../src/exchanges/oasis/OasisExchangeService';
import tokens from '../../../contracts/tokens';

test('sell Dai for WETH', (done) => {
  const oasisExchangeService = OasisExchangeService.buildEthersService();
  oasisExchangeService.manager().connect()
    .then(() => {
      return oasisExchangeService.sellDai(2, tokens.WETH);
    })
    .then(txHash=>{
      console.log('txHash: ', txHash);
      done();
    });
},25000);