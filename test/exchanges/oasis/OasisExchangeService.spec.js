import OasisExchangeService from '../../../src/exchanges/oasis/OasisExchangeService';
import Web3Service from '../../../src/eth/Web3Service';
import tokens from '../../../contracts/tokens';
import { utils } from 'ethers';
import testAccountProvider from '../../../src/utils/TestAccountProvider';
import orderType from '../../../src/exchanges/orderType';
import contracts from '../../../contracts/contracts';

test('sell Dai for WETH', (done) => setTimeout(() => {
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

/*
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
*/

/*attempting to create limit order on testnet, not working
test.only('create buy order on testnet', (done) => setTimeout(() => {
    const oasisExchangeService = OasisExchangeService.buildTestService();
    let oasisOrder = null;
    oasisExchangeService.manager().authenticate()
      .then(()=> {
        const ethToken = oasisExchangeService.get('ethereumToken').getToken(tokens.ETH);
        return ethToken.balanceOf(oasisExchangeService.get('web3').ethersSigner().address);
      })
      .then((balance) => {
        console.log('balance: ', balance.toString());
        const ethereumTokenService = oasisExchangeService.get('ethereumToken');
        const wethToken = ethereumTokenService.getToken(tokens.WETH);
        wethToken.deposit(utils.parseEther('2.0'));
        const oasisContract = oasisExchangeService.get('smartContract').getContractByName(contracts.MAKER_OTC);
        wethToken.approveUnlimited(oasisContract.address);
        const wethAddress = wethToken.address();
        const daiAddress = ethereumTokenService.getToken(tokens.DAI).address();
        var overrideOptions = { gasLimit: 5000000};
        oasisOrder = oasisExchangeService.offer(utils.parseEther('1.0'), wethAddress, utils.parseEther('10.0'), daiAddress, 0, overrideOptions);
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
*/
