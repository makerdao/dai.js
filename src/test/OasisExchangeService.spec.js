import OasisExchangeService from '../exchanges/oasis/OasisExchangeService';
import tokens from '../../contracts/tokens';

test('sell Dai for WETH', (done) => {
  const oasisExchangeService = OasisExchangeService.buildEthersService();
  oasisExchangeService.manager().connect()
    .then(() => {
      return oasisExchangeService.sellDai(2, tokens.WETH);
    })
    .then(txHash=>{
      console.log('txHash._transaction: ', txHash._transaction);
      done();
    });

},25000);