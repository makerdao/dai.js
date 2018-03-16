import OasisExchangeService from '../../../src/exchanges/oasis/OasisExchangeService';
import Web3Service from '../../../src/eth/Web3Service';
import tokens from '../../../contracts/tokens';
import { utils } from 'ethers';
import testAccountProvider from '../../../src/utils/TestAccountProvider';
import orderType from '../../../src/exchanges/orderType';

test.only('sell Dai for WETH', (done) => setTimeout(() => {
    const oasisExchangeService = OasisExchangeService.buildKovanService();
    let oasisOrder = null;
    oasisExchangeService.manager().authenticate()
      .then(() => {
        oasisOrder = oasisExchangeService.sellDai(utils.parseEther('0.01'), tokens.WETH);
        return oasisOrder._transaction;
      })
      .then(tx => {
        console.log(tx);
        expect(tx.data.length).toBeGreaterThan(20);
        expect(oasisOrder.type()).toBe('market');
        done();
      });
  },
  15000),
  30000
);

test('sell Dai spoof', (done) => setTimeout(() => {
    const account = testAccountProvider.nextAccount();
    const oasisExchangeService = OasisExchangeService.buildTestService(account.key);
    oasisExchangeService.manager().authenticate() 
      .then(() => {
        const oasisOrder = oasisExchangeService.sellDaiSpoof(utils.parseEther('0.01'), tokens.WETH);
        return oasisOrder._transaction;
      })
      .then(tx => {
        console.log('tx: ', tx);
        //expect(tx.data.length).toBeGreaterThan(20);
        done();
      })
  },
  5000),
  10000
);
