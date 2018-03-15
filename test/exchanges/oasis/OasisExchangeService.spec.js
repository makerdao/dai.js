import OasisExchangeService from '../../../src/exchanges/oasis/OasisExchangeService';
import Web3Service from '../../../src/eth/Web3Service';
import tokens from '../../../contracts/tokens';
import { utils } from 'ethers';
import testAccountProvider from '../../../src/utils/TestAccountProvider'

test('sell Dai for WETH', (done) => setTimeout(() => {
    const oasisExchangeService = OasisExchangeService.buildKovanService();
    oasisExchangeService.manager().authenticate()
      .then(() => oasisExchangeService.sellDai(utils.parseEther('0.01'), tokens.WETH))
      .then(tx => {
        expect(tx.data.length).toBeGreaterThan(20);
        done();
      });
  },
  15000),
  30000
);

test.only('sell Dai spoof', (done) => setTimeout(() => {
    const account = testAccountProvider.nextAccount();
    const oasisExchangeService = OasisExchangeService.buildTestService(account.key);
    oasisExchangeService.manager().authenticate() 
      .then(() => {
        oasisExchangeService.sellDaiSpoof(utils.parseEther('0.01'), tokens.WETH);})
      .then(tx => {
        console.log('tx: ', tx);
        //expect(tx.data.length).toBeGreaterThan(20);
        done();
      })
      
  },
  5000),
  10000
);
