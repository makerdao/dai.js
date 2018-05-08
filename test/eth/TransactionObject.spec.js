import EthereumTokenService from '../../src/eth/EthereumTokenService';
import tokens from '../../contracts/tokens';
import TestAccountProvider from '../../src/utils/TestAccountProvider';
import TransactionState from '../../src/eth/TransactionState';
//import OasisExchangeService from '../../src/exchanges/oasis/OasisExchangeService';

/*
test('TransactionObject event listeners work as promises - kovan', done => {
  const oasisService = OasisExchangeService.buildKovanService();
  let service = null;
  //const service = EthereumTokenService.buildTestService();
  //service.manager().authenticate()
  oasisService.manager().authenticate()
    .then(() => {
      service = oasisService.get('ethereumToken');
      const wethToken = service.getToken(tokens.WETH);
      const randomAddress = TestAccountProvider.nextAddress();
      const TransactionObject = wethToken.approveUnlimited(randomAddress);
      //TransactionObject.onError(()=>{console.log('onError() triggered');});
      return TransactionObject.onPending();
    })
    .then(TransactionObject=>{
      expect(TransactionObject.state()).toBe(TransactionState.pending);
      return TransactionObject.onMined();
    })
    .then(TransactionObject=>{
      expect(TransactionObject.state()).toBe(TransactionState.mined);
      return TransactionObject.onFinalized();
    })
    .then(TransactionObject=>{
      //console.log('finalized!');
      expect(TransactionObject.state()).toBe(TransactionState.finalized);
      done();
    });
}, 5000);
*/

test('TransactionObject event listeners work as promises', done => {
  const service = EthereumTokenService.buildTestService();
  let wethToken = null;
  let randomAddress = TestAccountProvider.nextAddress();
  let initialTransaction = null;
  service.manager().authenticate()
    .then(() => {
      wethToken = service.getToken(tokens.WETH);
      initialTransaction = wethToken.approveUnlimited(randomAddress);
      initialTransaction.onFinalized(()=>{
        expect(initialTransaction.state()).toBe(TransactionState.finalized);
        done();
      });
      //TransactionObject.onError(()=>{console.log('onError() triggered');});
      return initialTransaction.onPending();
    })
    .then(TransactionObject=>{
      expect(TransactionObject.state()).toBe(TransactionState.pending);
      return TransactionObject.onMined();
    })
    .then(TransactionObject=>{
      expect(TransactionObject.state()).toBe(TransactionState.mined);
      return wethToken.approveUnlimited(randomAddress).onMined();
    })
    .then(() =>{
      return wethToken.approveUnlimited(randomAddress).onMined();
    })
    .then(() =>{
      return wethToken.approveUnlimited(randomAddress).onMined();
    });
    /*.then(()=>{
      console.log('calling onfinalized()');
      return initialTransaction.onFinalized();
    })
    .then(TransactionObject=>{
      console.log('finalized!');
      expect(TransactionObject.state()).toBe(TransactionState.finalized);
      done();
    });*/
}, 5000);

test('get fees from TransactionObject', done => {
  const service = EthereumTokenService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      const wethToken = service.getToken(tokens.WETH);
      const randomAddress = TestAccountProvider.nextAddress();
      const TransactionObject = wethToken.approveUnlimited(randomAddress);
      //TransactionObject.onError(()=>{console.log('onError() triggered');});
      return TransactionObject.onMined();
    })
    .then(TransactionObject=>{
      expect(TransactionObject.state()).toBe(TransactionState.mined);
      expect(parseFloat(TransactionObject.fees())).toBeGreaterThan(0);
      done();
    });
}, 5000);

test('TransactionObject event listeners work as callbacks', done => {
  //const oasisService = OasisExchangeService.buildKovanService();
  //let service = null;
  const service = EthereumTokenService.buildTestService();
  service.manager().authenticate()
  //oasisService.manager().authenticate()
    .then(() => {
      //service = oasisService.get('ethereumToken');
      const wethToken = service.getToken(tokens.WETH);
      const randomAddress = TestAccountProvider.nextAddress();
      const TransactionObject = wethToken.approveUnlimited(randomAddress);
      TransactionObject.onError(()=>{
        //console.log('onError() triggered');
        expect(TransactionObject.state()).toBe(TransactionState.error);
      });
      TransactionObject.onPending(()=>{
      expect(TransactionObject.state()).toBe(TransactionState.pending);
      });
      TransactionObject.onMined(()=>{
        expect(TransactionObject.state()).toBe(TransactionState.mined);
        wethToken.approveUnlimited(randomAddress).onMined(()=>{
          wethToken.approveUnlimited(randomAddress).onMined(()=>{
            wethToken.approveUnlimited(randomAddress);
          });
        });
      });
      TransactionObject.onFinalized(()=>{
      //console.log('finalized callback');
      expect(TransactionObject.state()).toBe(TransactionState.finalized);
      done();
      });
    });
}, 5000);

/* need to figure out a way to induce error state
test('TransactionObject error event listeners works', done => {
  //const oasisService = OasisExchangeService.buildKovanService();
  //let service = null;
  const service = EthereumTokenService.buildTestService();
  service.manager().authenticate()
  //oasisService.manager().authenticate()
    .then(() => {
      //service = oasisService.get('ethereumToken');
      const wethToken = service.getToken(tokens.WETH);
      const randomAddress = TestAccountProvider.nextAddress();
      const TransactionObject = wethToken.approveUnlimited(randomAddress);
      TransactionObject.onError(()=>{
        //console.log('onError() triggered');
        done();
      });
    });
}, 5000);
*/
