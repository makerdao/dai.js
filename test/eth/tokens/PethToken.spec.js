import EthereumTokenService from '../../../src/eth/EthereumTokenService';
import tokens from '../../../contracts/tokens';
import TestAccountProvider from '../../../src/utils/TestAccountProvider';

test('get PETH balance of address', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().authenticate().then(() => {
      const token = ethereumTokenService.getToken(tokens.PETH);
      return token.balanceOf(TestAccountProvider.nextAddress());
    })
    .then(balance =>{
      expect(balance.toString()).toBe('0');
      done();
    });
});

test('get PETH allowance of address', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().authenticate().then(() => {
      const token = ethereumTokenService.getToken(tokens.PETH);
      return token.allowance(TestAccountProvider.nextAddress(), TestAccountProvider.nextAddress());
    })
    .then(allowance => {
      expect(allowance.toString()).toBe('0');
      done();
    });
});
