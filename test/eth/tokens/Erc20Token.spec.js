import EthereumTokenService from '../../../src/eth/EthereumTokenService';
import tokens from '../../../contracts/tokens';
import TestAccountProvider from '../../../src/utils/TestAccountProvider';

test('get ERC20 (MKR) balance of address', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().connect()
    .then(() => {
      const token = ethereumTokenService.getToken(tokens.MKR);
      return token.balanceOf(TestAccountProvider.nextAddress());
    })
    .then(balance =>{
      expect(balance.toString()).toBe('0');
      done();
    });
});

test('get ERC20 (MKR) allowance of address', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().connect()
    .then(() => {
      const token = ethereumTokenService.getToken(tokens.MKR);
      return token.allowance(TestAccountProvider.nextAddress(), TestAccountProvider.nextAddress());
    })
    .then(allowance => {
      expect(allowance.toString()).toBe('0');
      done();
    });
});
