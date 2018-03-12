import OasisExchangeService from '../../../src/exchanges/oasis/OasisExchangeService';
import tokens from '../../../contracts/tokens';
import { utils } from 'ethers';

test('sell Dai for WETH', (done) => setTimeout(() => {
    const oasisExchangeService = OasisExchangeService.buildTestService();
    oasisExchangeService.manager().connect()
      .then(() => oasisExchangeService.sellDai(utils.parseEther('0.01'), tokens.WETH))
      .then(tx => {
        expect(tx.data.length).toBeGreaterThan(20);
        done();
      });
  },
  15000),
  30000
);