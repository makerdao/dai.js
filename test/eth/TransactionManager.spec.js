import EthereumTokenService from '../../src/eth/EthereumTokenService';
import TransactionManager from '../../src/eth/TransactionManager';

function buildTestServices() {
  const tokenService = EthereumTokenService.buildTestService(),
    transactionManager = TransactionManager.buildTestService(tokenService.get('web3'));

  return Promise.all([
    tokenService.manager().authenticate(),
    transactionManager.manager().authenticate()]
  ).then(() => ({
    token: tokenService,
    txMgr: transactionManager
  }));
}

test('should reuse the same web3 and log service in test services', done => {
  buildTestServices().then(services => {
    expect(services.token.manager().isAuthenticated()).toBe(true);
    expect(services.txMgr.manager().isAuthenticated()).toBe(true);
    expect(services.txMgr.get('web3')).toBe(services.token.get('web3'));
    expect(services.txMgr.get('log')).toBe(services.token.get('web3').get('log'));
    done();
  });
});
