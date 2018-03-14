import OasisExchangeService from '../../../src/exchanges/oasis/OasisExchangeService';
import Web3Service from '../../../src/eth/Web3Service';
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

test('create test blockchain that sets EthersSigner to account passed in to Web3Service', (done) => setTimeout(() => {
    const service1 = Web3Service.buildTestService();
    const service2 = Web3Service.buildTestService();
    service1.manager().connect()
      .then(() => service2.manager().connect())
      .then(() => {
        done();
      })
      
  },
  15000),
  30000
);
