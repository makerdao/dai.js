import OasisExchangeService from '../../../src/exchanges/oasis/OasisExchangeService';
import tokens from '../../../contracts/tokens';
import EthereumCdpService from '../../../src/eth/EthereumCdpService';
import TransactionState from '../../../src/eth/TransactionState';
import contracts from '../../../contracts/contracts';
import TestAccountProvider from '../../../src/utils/TestAccountProvider';
import {watch} from '../../../src/utils';
const utils = require('ethers').utils;

function _placeLimitOrder(oasisExchangeService, sellDai){
    let ethereumTokenService = null;
    ethereumTokenService = oasisExchangeService.get('token');
    const wethToken = ethereumTokenService.getToken(tokens.WETH);
    const daiToken = ethereumTokenService.getToken(tokens.DAI);
    return wethToken.deposit('1').onMined()
      .then(()=>{
        const oasisContract = oasisExchangeService.get('smartContract').getContractByName(contracts.MAKER_OTC);
        return wethToken.approveUnlimited(oasisContract.getAddress()).onMined();
      })
      .then(()=>{
        //console.log('weth unlimited approval to oasis');
        return wethToken.balanceOf(oasisExchangeService.get('web3').defaultAccount());
      })
      .then(balance=>{
        //console.log('weth balance before placing limit orders: ', balance);
        return daiToken.balanceOf(oasisExchangeService.get('web3').defaultAccount());
      })
      .then(balance=>{
        //console.log('dai balance before placing limit orders: ', balance);
        const wethAddress = wethToken.address();
        const daiAddress = ethereumTokenService.getToken(tokens.DAI).address();
        var overrideOptions = { gasLimit: 5500000};
        if (sellDai){
          return oasisExchangeService.offer(utils.parseEther('0.5'), daiAddress, utils.parseEther('2.0'), wethAddress, 0, overrideOptions).onMined();
        }
        else{
          return oasisExchangeService.offer(utils.parseEther('0.5'), wethAddress, utils.parseEther('10.0'), daiAddress, 1, overrideOptions).onMined();
        }
      })
      .then(()=>{
        return wethToken.balanceOf(oasisExchangeService.get('web3').defaultAccount());
      })
      .then(balance=>{
        //console.log('weth balance after placing limit order: ', balance);
      })
      .then(()=>{
        return daiToken.balanceOf(oasisExchangeService.get('web3').defaultAccount());
      })
      .then(balance=>{
        //console.log('dai balance after placing limit order: ', balance);
      })
      .catch(reason => {
      //console.log('limit order failed', reason);
      //done.fail();
      //throw reason;
    });
}

function createDaiAndPlaceLimitOrder(oasisExchangeService, sellDai = false){
  let newCdp, firstInkBalance, firstDaiBalance, defaultAccount;
  let createdCdpService = oasisExchangeService.get('cdp');
  return createdCdpService.openCdp().onMined()
    .then(cdp => {
      defaultAccount = createdCdpService.get('token').get('web3').defaultAccount();
      //console.log('defaultAccount', defaultAccount);
      newCdp = cdp;
      return Promise.all([
        newCdp.getInfo(),
        createdCdpService.get('token').getToken(tokens.DAI).balanceOf(defaultAccount)
      ]);
    })
    .then(info => {
      firstInkBalance = parseFloat(info[0].ink);
      firstDaiBalance = parseFloat(info[1].toString());
      //console.log('firstInk', firstInkBalance, 'firstDai', firstDaiBalance);
      return newCdp.lockEth('0.1').then(txn => txn.onMined());
    })

    //.then(() => createdCdpService.get('smartContract').getContractState(contracts.SAI_TUB, 5, true, []))
    //.then(tub => console.log(tub))
    .then(() => newCdp.getInfo())
    .then(info => {
      //console.log(info);
      expect(parseFloat(info.ink)).toBeCloseTo(firstInkBalance + 100000000000000000);
      return newCdp.drawDai('1').then(txn => txn.onMined());
    })
    .then(() => Promise.all([
      newCdp.getInfo(),
      createdCdpService.get('token').getToken(tokens.DAI).balanceOf(defaultAccount)
    ]))
    .then(result => {
      //console.log(result);
      expect(parseFloat(result[1].toString())).toBeCloseTo(firstDaiBalance + 1.0);
      return _placeLimitOrder(oasisExchangeService, sellDai);
    })
    .catch(reason => {
      //console.log('oasis setup failed', reason);
      //done.fail();
      //throw reason;
    });
}

test('sell Dai, dai balance decreases', (done) => {
  const oasisExchangeService = OasisExchangeService.buildTestService();
  let oasisOrder = null;
  let initialBalance = 0;
  let finalBalance = 0;
  let daiToken = null;
  oasisExchangeService.manager().authenticate()
    .then(()=>{
      return createDaiAndPlaceLimitOrder(oasisExchangeService);
    })
    .then(() => {
      const oasisContract = oasisExchangeService.get('smartContract').getContractByName(contracts.MAKER_OTC);
      return oasisContract.getBestOffer('0x7ba25f791fa76c3ef40ac98ed42634a8bc24c238', '0xc226f3cd13d508bc319f4f4290172748199d6612');
    })
    .then(bestOffer=>{
      //console.log('bestOffer', bestOffer.toString());
    })
    .then(() => {
      const ethereumTokenService = oasisExchangeService.get('token');

      const wethAddress = ethereumTokenService.getToken(tokens.WETH).address();
      const daiAddress = ethereumTokenService.getToken(tokens.DAI).address();
      //console.log('wethAddress', wethAddress, 'daiAddress', daiAddress);

      daiToken = ethereumTokenService.getToken(tokens.DAI);
      //const ethToken = ethereumTokenService.getToken(tokens.ETH);
      return daiToken.balanceOf(oasisExchangeService.get('web3').defaultAccount());
    })
    .then(balance =>{
      //console.log('dai balance before selling dai: ', balance);
      initialBalance = balance;
      const wethToken = oasisExchangeService.get('token').getToken(tokens.WETH);
      return wethToken.balanceOf(oasisExchangeService.get('web3').defaultAccount());;
    })
    .then(balance =>{
      //console.log('weth balance before selling dai: ', balance);
      const oasisContract = oasisExchangeService.get('smartContract').getContractByName(contracts.MAKER_OTC);

      //const wethToken = oasisExchangeService.get('token').getToken(tokens.WETH);
      return daiToken.approveUnlimited(oasisContract.getAddress()).onMined();
    })
    .then(()=>{
      const daiAddress = oasisExchangeService.get('token').getToken(tokens.DAI).address();
      const oasisContract = oasisExchangeService.get('smartContract').getContractByName(contracts.MAKER_OTC);

      //return daiToken.allowance(oasisExchangeService.get('web3').defaultAccount(), oasisContract.getAddress());

      //const wethToken = oasisExchangeService.get('token').getToken(tokens.WETH);
      return daiToken.allowance(oasisExchangeService.get('web3').defaultAccount(), oasisContract.getAddress());
    })
    .then(allowance=>{
      //console.log('allowance', allowance);
    })
    .then(()=>{
      oasisOrder = oasisExchangeService.sellDai('0.01', tokens.WETH);
      return oasisOrder.onMined();
    })
    .then(oasisOrder=>{
        const ethereumTokenService = oasisExchangeService.get('token');
        const token = ethereumTokenService.getToken(tokens.WETH);
        return token.balanceOf(oasisExchangeService.get('web3').defaultAccount());
    })
    .then(balance =>{
        //console.log('weth balance after selling dai: ', balance);
        const ethereumTokenService = oasisExchangeService.get('token');
        const token = ethereumTokenService.getToken(tokens.DAI);
        return token.balanceOf(oasisExchangeService.get('web3').defaultAccount());
    })
    .then(balance =>{
        //console.log('dai balance after selling dai: ', balance);
        finalBalance = balance;
        done();
    });
});



test('get fees and fillAmount sell Dai', (done) => {
  const oasisExchangeService = OasisExchangeService.buildTestService();
  let oasisOrder = null;
  oasisExchangeService.manager().authenticate()
    .then(()=>{
      return createDaiAndPlaceLimitOrder(oasisExchangeService);
    })
    .then(() => {
      const daiToken = oasisExchangeService.get('token').getToken(tokens.DAI);
      const oasisContract = oasisExchangeService.get('smartContract').getContractByName(contracts.MAKER_OTC);
      return daiToken.approveUnlimited(oasisContract.getAddress()).onMined();
    })
    .then(() => {
      oasisOrder = oasisExchangeService.sellDai('0.01', tokens.WETH);
      oasisOrder.onMined(()=>{
        expect(parseFloat(oasisOrder.fees(),10)).toBeGreaterThan(0);
        expect(parseFloat(oasisOrder.fillAmount(),10)).toBeGreaterThan(0);
        done();
      });
    });
});

test('get fees and fillAmount buy Dai', (done) =>  {
  const oasisService = OasisExchangeService.buildTestService();
  let oasisOrder = null;
  oasisService.manager().authenticate()
    .then(()=>{
      return createDaiAndPlaceLimitOrder(oasisService, true);
    })
    .then(() => {
      const wethToken = oasisService.get('token').getToken(tokens.WETH);
      const oasisContract = oasisService.get('smartContract').getContractByName(contracts.MAKER_OTC);
      return wethToken.approveUnlimited(oasisContract.getAddress()).onMined();
    })
    .then(() => {
      oasisOrder = oasisService.buyDai('0.01', tokens.WETH);
      oasisOrder.onMined(()=>{
        //console.log('fillAmount: ', oasisOrder.fillAmount());
        expect(parseFloat(oasisOrder.fees(),10)).toBeGreaterThan(0);
        expect(parseFloat(oasisOrder.fillAmount(),10)).toBeGreaterThan(0);
        done();
      });
    });
});



test('OasisOrder properly finalizes', done => {
  const oasisService = OasisExchangeService.buildTestService();
  let oasisOrder = null;
  let daiToken = null;
  let randomAddress = TestAccountProvider.nextAddress();
  let order = null;
  oasisService.manager().authenticate()
    .then(()=>{
      return createDaiAndPlaceLimitOrder(oasisService);
    })
    .then(() => {
      daiToken = oasisService.get('token').getToken(tokens.DAI);
      const oasisContract = oasisService.get('smartContract').getContractByName(contracts.MAKER_OTC);
      return daiToken.approveUnlimited(oasisContract.getAddress()).onMined();
    })
    .then(() => {
      oasisOrder = oasisService.sellDai('0.01', tokens.WETH);
      //TransactionObject.onError(()=>{console.log('onError() triggered');});
      order = oasisOrder;
      return oasisOrder.onPending();
    })
    .then(OrderObject=>{
      expect(OrderObject.state()).toBe(TransactionState.pending);
      return OrderObject.onMined();
    })
    .then(OrderObject=>{
      expect(OrderObject.state()).toBe(TransactionState.mined);
      daiToken = oasisService.get('token').getToken(tokens.DAI);
      return daiToken.approveUnlimited(randomAddress).onMined();
    })
    .then(() =>{
      return daiToken.approveUnlimited(randomAddress).onMined();
    })
    .then(() =>{
      return daiToken.approveUnlimited(randomAddress).onMined();
    })
    .then(() =>{
      return daiToken.approveUnlimited(randomAddress).onMined();
    })
    .then(OrderObject=>{
      return order.onFinalized();
    })
    .then(OrderObject=>{
      expect(OrderObject.state()).toBe(TransactionState.finalized);
      done();
    })
    .catch(reason=>{
      //console.log('error in then chain:', reason);
    });
});

