import EthereumTokenService from '../../src/eth/EthereumTokenService';
import tokens from '../../contracts/tokens';
import TestAccountProvider from '../../src/utils/TestAccountProvider';
import TransactionState from '../../src/eth/TransactionState';
import OasisExchangeService from '../../src/exchanges/oasis/OasisExchangeService';

test('TransactionObject event listeners work as promises', done => {
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
},25000);

test('TransactionObject event listeners work as callbacks', done => {
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
      TransactionObject.onError(()=>{
        //console.log('onError() triggered');
        expect(TransactionObject.state()).toBe(TransactionState.error);
      });
      TransactionObject.onPending(()=>{
      expect(TransactionObject.state()).toBe(TransactionState.pending);
      });
      TransactionObject.onMined(()=>{
      expect(TransactionObject.state()).toBe(TransactionState.mined);
      });
      TransactionObject.onFinalized(()=>{
      //console.log('finalized callback');
      expect(TransactionObject.state()).toBe(TransactionState.finalized);
      done();
      });
    });
},25000);

//currently using the test blockchain causes it to go to the error state
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
},10000);