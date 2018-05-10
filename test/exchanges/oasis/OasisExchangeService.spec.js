import OasisExchangeService from '../../../src/exchanges/oasis/OasisExchangeService';
import tokens from '../../../contracts/tokens';
//import TransactionState from '../../../src/eth/TransactionState';
import contracts from '../../../contracts/contracts';
//import TestAccountProvider from '../../../src/utils/TestAccountProvider';
const utils = require('ethers').utils;


beforeAll(()=>{ //can comment this out after has been run once
    const oasisExchangeService = OasisExchangeService.buildTestService();
    let wethToken = null;
    let ethereumTokenService = null;
    return oasisExchangeService.manager().authenticate()
      .then(()=> {
        ethereumTokenService = oasisExchangeService.get('token');
        wethToken = ethereumTokenService.getToken(tokens.WETH);
        return wethToken.deposit('0.1').onMined(); 
      })
      .then(()=>{
        //console.log('weth deposited.  tx: ', depositTx);
        const oasisContract = oasisExchangeService.get('smartContract').getContractByName(contracts.MAKER_OTC);
        return wethToken.approveUnlimited(oasisContract.address).onMined();
      })
      .then(()=>{
        //console.log('weth unlimited approval to oasis');
        return wethToken.balanceOf(oasisExchangeService.get('web3').defaultAccount());
      })
      .then(()=>{
        //console.log('weth balance before placing limit order: ', balance);
        const wethAddress = wethToken.address();
        const daiAddress = ethereumTokenService.getToken(tokens.DAI).address();
        var overrideOptions = { gasLimit: 5000000};
        return Promise.all([
          oasisExchangeService.offer(utils.parseEther('0.06'), daiAddress, utils.parseEther('5.0'), wethAddress, 0, overrideOptions).onMined(),
          oasisExchangeService.offer(utils.parseEther('0.05'), wethAddress, utils.parseEther('10.0'), daiAddress, 0, overrideOptions).onMined()
        ]);
      })
      .then(()=>{
        //console.log('oasis limit order', oasisOrder);
        return wethToken.balanceOf(oasisExchangeService.get('web3').defaultAccount());
      })
      .then(()=>{
        //console.log('weth balance after placing limit order: ', balance);
      });
}, 30000);


/*
test('sell Dai, dai balance decreases', (done) => {
  const oasisExchangeService = OasisExchangeService.buildTestService();
  let oasisOrder = null;
  let initialBalance = 0;
  let finalBalance = 0;
  let daiToken = null;
  oasisExchangeService.manager().authenticate()
    .then(() => {
      const oasisContract = oasisExchangeService.get('smartContract').getContractByName(contracts.MAKER_OTC);
      return oasisContract.getBestOffer('0x7ba25f791fa76c3ef40ac98ed42634a8bc24c238', '0xc226f3cd13d508bc319f4f4290172748199d6612');
    })
    .then(bestOffer=>{
      console.log('bestOffer', bestOffer.toString());
    })
    .then(() => {
      const ethereumTokenService = oasisExchangeService.get('token');

      const wethAddress = ethereumTokenService.getToken(tokens.WETH).address();
      const daiAddress = ethereumTokenService.getToken(tokens.DAI).address();
      console.log('wethAddress', wethAddress, 'daiAddress', daiAddress);

      daiToken = ethereumTokenService.getToken(tokens.DAI);
      //const ethToken = ethereumTokenService.getToken(tokens.ETH);
      return daiToken.balanceOf(oasisExchangeService.get('web3').defaultAccount());
    })
    .then(balance =>{
      console.log('dai balance before selling dai: ', balance);
      initialBalance = balance;
      const wethToken = oasisExchangeService.get('token').getToken(tokens.WETH);
      return wethToken.balanceOf(oasisExchangeService.get('web3').defaultAccount());;
    })
    .then(balance =>{
      console.log('weth balance before selling dai: ', balance);
      const oasisContract = oasisExchangeService.get('smartContract').getContractByName(contracts.MAKER_OTC);
      return daiToken.approveUnlimited(oasisContract.address).onMined();
    })
    .then(()=>{
      const daiAddress = oasisExchangeService.get('token').getToken(tokens.DAI).address();
      const oasisContract = oasisExchangeService.get('smartContract').getContractByName(contracts.MAKER_OTC);
      return daiToken.allowance(oasisExchangeService.get('web3').defaultAccount(), oasisContract.address);
    })
    .then(allowance=>{
      console.log('allowance', allowance);
    })
    .then(()=>{
      oasisOrder = oasisExchangeService.sellDai('1', tokens.WETH);
      return oasisOrder.onMined();
    })
    .then(oasisOrder=>{
        const ethereumTokenService = oasisExchangeService.get('token');
        const token = ethereumTokenService.getToken(tokens.WETH);
        return token.balanceOf(oasisExchangeService.get('web3').defaultAccount());
    })
    .then(balance =>{
        console.log('weth balance after selling dai: ', balance);
        const ethereumTokenService = oasisExchangeService.get('token');
        const token = ethereumTokenService.getToken(tokens.DAI);
        return token.balanceOf(oasisExchangeService.get('web3').defaultAccount());
    })
    .then(balance =>{
        console.log('dai balance after selling dai: ', balance);
        finalBalance = balance;
        done();
    });
},
30000
);
*/


test('get fees and fillAmount sell Dai', (done) => {
  const oasisExchangeService = OasisExchangeService.buildTestService();
  let oasisOrder = null;
  oasisExchangeService.manager().authenticate()
    .then(() => {
      const daiToken = oasisExchangeService.get('token').getToken(tokens.DAI);
      const oasisContract = oasisExchangeService.get('smartContract').getContractByName(contracts.MAKER_OTC);
      return daiToken.approveUnlimited(oasisContract.address).onMined();
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
    .then(() => {
      const wethToken = oasisService.get('token').getToken(tokens.WETH);
      const oasisContract = oasisService.get('smartContract').getContractByName(contracts.MAKER_OTC);
      return wethToken.approveUnlimited(oasisContract.address).onMined();
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


/*
test('OasisOrder properly finalizes', done => {
  const oasisService = OasisExchangeService.buildTestService();
  let oasisOrder = null;
  let daiToken = null;
  let randomAddress = TestAccountProvider.nextAddress();
  oasisService.manager().authenticate()
    .then(() => {
      daiToken = oasisService.get('token').getToken(tokens.DAI);
      const oasisContract = oasisService.get('smartContract').getContractByName(contracts.MAKER_OTC);
      return daiToken.approveUnlimited(oasisContract.address).onMined();
    })
    .then(() => {
      oasisOrder = oasisService.sellDai('0.01', tokens.WETH);
      //TransactionObject.onError(()=>{console.log('onError() triggered');});
      return oasisOrder.onPending();
    })
    .then(OrderObject=>{
      expect(OrderObject.state()).toBe(TransactionState.pending);
      return OrderObject.onMined();
    })
    .then(OrderObject=>{
      expect(OrderObject.state()).toBe(TransactionState.mined);
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
    .then(() =>{
      return daiToken.approveUnlimited(randomAddress).onMined();
    })
    .then(OrderObject=>{
      return OrderObject.onFinalized();
    })
    .then(OrderObject=>{
      expect(OrderObject.state()).toBe(TransactionState.finalized);
      done();
    });
}, 10000);
*/


