import OasisExchangeService from '../../../src/exchanges/oasis/OasisExchangeService';
// import Web3Service from '../../../src/eth/Web3Service';
import tokens from '../../../contracts/tokens';
// import testAccountProvider from '../../../src/utils/TestAccountProvider';
// import orderStyle from '../../../src/exchanges/orderStyle';
import TransactionState from '../../../src/eth/TransactionState';
import contracts from '../../../contracts/contracts';
const utils = require('ethers').utils;

beforeAll(()=>{ //can comment this out after has been run once
    const oasisExchangeService = OasisExchangeService.buildTestService();
    let oasisOrder = null;
    let wethToken = null;
    let ethereumTokenService = null;
    oasisExchangeService.manager().authenticate()
      .then(()=> {
        ethereumTokenService = oasisExchangeService.get('ethereumToken');
        wethToken = ethereumTokenService.getToken(tokens.WETH);
        return wethToken.deposit('0.1').onPending(); //I think doing this will make sure we don't use the same nonce twice
      })
      .then(()=>{
        const oasisContract = oasisExchangeService.get('smartContract').getContractByName(contracts.MAKER_OTC);
        return wethToken.approveUnlimited(oasisContract.address).onPending();
      })
      .then(()=>{
        const wethAddress = wethToken.address();
        const daiAddress = ethereumTokenService.getToken(tokens.DAI).address();
        var overrideOptions = { gasLimit: 5000000};
        oasisOrder = oasisExchangeService.offer(utils.parseEther('0.05'), wethAddress, utils.parseEther('10.0'), daiAddress, 0, overrideOptions);
        return oasisOrder;
      });
}, 30000);



test('get fees sell Dai', (done) => {
  const oasisExchangeService = OasisExchangeService.buildKovanService();
  let oasisOrder = null;
  oasisExchangeService.manager().authenticate()
    .then(() => {
      oasisOrder = oasisExchangeService.sellDai('0.01', tokens.WETH);
      oasisOrder.onMined(()=>{
        //console.log('fees', oasisOrder.fees());
        expect(parseFloat(oasisOrder.fees(),10)).toBeGreaterThan(0);
        done();
      });
    });
},
30000
);

test('get fillAmount sellDai', (done) =>  {
  const oasisExchangeService = OasisExchangeService.buildKovanService();
  let oasisOrder = null;
  oasisExchangeService.manager().authenticate()
    .then(() => {
      oasisOrder = oasisExchangeService.sellDai('0.01', tokens.WETH);
      oasisOrder.onMined(()=>{
        //console.log('fillAmount', oasisOrder.fillAmount());
        expect(parseFloat(oasisOrder.fillAmount(),10)).toBeGreaterThan(0);
        done();
      });
    });
},
30000
);

test('OasisOrder event listeners work as promises, and can use business object', done => {
  const oasisService = OasisExchangeService.buildKovanService();
  let oasisOrder = null;
  oasisService.manager().authenticate()
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
      return OrderObject.onFinalized();
    })
    .then(OrderObject=>{
      expect(OrderObject.state()).toBe(TransactionState.finalized);
      done();
    });
},35000);


test('get fillAmount buyDai', (done) =>  {
  const oasisExchangeService = OasisExchangeService.buildKovanService();
  let oasisOrder = null;
  oasisExchangeService.manager().authenticate()
    .then(() => {
      oasisOrder = oasisExchangeService.buyDai('0.01', tokens.WETH);
      oasisOrder.onMined(()=>{
        //console.log('fillAmount: ', oasisOrder.fillAmount());
        expect(parseFloat(oasisOrder.fillAmount(),10)).toBeGreaterThan(0);
        done();
      });
    });
},
30000
);
/*
test('test keccak', (done) => setTimeout(() => {
  const oasisExchangeService = OasisExchangeService.buildKovanService();
  let oasisOrder = null;
  oasisExchangeService.manager().authenticate()
    .then(()=>{
      //const string = 'LogTrade(uint256,address,uint256,address)';
      const string = 'LogTake(bytes32,bytes32,address,address,address,address,uint128,uint128,uint64)';
      const hex = oasisExchangeService.get('web3')._web3.toHex(string);
        console.log(utils.keccak256(hex));
      done();
    });
},
1000),
3000
);*/


/*
test('sell Dai on testnet', (done) => setTimeout(() => {
  const oasisExchangeService = OasisExchangeService.buildTestService();
  let oasisOrder = null;
  oasisExchangeService.manager().authenticate()
    .then(()=>{
      //acquire some DAI
    })
    .then(()=>{
      const daiToken = oasisExchangeService.get('ethereumToken').getToken(tokens.DAI);
      return daiToken.approveUnlimited(oasisExchangeService.get('smartContract').getContractByName(contracts.MAKER_OTC).address);
    })
    .then(tx => {
      //console.log('dai approval tx:', tx);
      done();
      //oasisOrder = oasisExchangeService.sellDai('0.1', tokens.WETH);
      //return oasisOrder._transaction;
    });
  /*
    .then(tx => {
      //console.log(tx);
      expect(tx.data.length).toBeGreaterThan(20);
      expect(oasisOrder.type()).toBe('market');
      done();
    });
},
2000),
4000
);