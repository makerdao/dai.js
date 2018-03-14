import OasisExchangeService from '../../../src/exchanges/oasis/OasisExchangeService';
import Web3Service from '../../../src/eth/Web3Service';
import tokens from '../../../contracts/tokens';
import { utils } from 'ethers';
import testAccountProvider from '../../../src/utils/TestAccountProvider'
import testAccounts from '../../../src/utils/testAccounts'

test('sell Dai for WETH', (done) => setTimeout(() => {
    const oasisExchangeService = OasisExchangeService.buildKovanService();
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
    console.log(testAccountProvider);
    const account1 = testAccountProvider.nextAccount();
    const account2 = testAccountProvider.nextAccount();
    console.log('1');
    const service1 = OasisExchangeService.buildTestService(account1.key);
    const service2 = OasisExchangeService.buildTestService(account2.key);
    console.log('account1.key', account1.key);
    console.log('account2.key', account2.key);
    service1.manager().connect()
      .then(() => service2.manager().connect())
      .then(() => {
        done();
      })
      
  },
  5000),
  10000
);
