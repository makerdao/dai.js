import EthereumTokenService from '../../src/eth/EthereumTokenService';
import tokens from '../../contracts/tokens';
import TestAccountProvider from '../../src/utils/TestAccountProvider';
import TransactionState from '../../src/eth/TransactionState'

test.only('TransactionObject event listeners work as promises', done => {
  const service = EthereumTokenService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      const wethToken = service.getToken(tokens.WETH);
      const randomAddress = TestAccountProvider.nextAddress();
      const TransactionObject = wethToken.approveUnlimited(randomAddress);
      TransactionObject.onError(()=>{console.log('onError() triggered');});
      return TransactionObject.onPending();
    })
    .then(TransactionObject=>{
      expect(TransactionObject.state()).toBe(TransactionState.pending);
      return TransactionObject.onMined();
    })
    .then(TransactionObject=>{
      expect(TransactionObject.state()).toBe(TransactionState.mined);
      done();
      //return TransactionObject.onFinalized();
    })
    /*.then(TransactionObject=>{
      expect(TransactionObject.state()).toBe(TransactionState.finalized);
    })*/
},10000);