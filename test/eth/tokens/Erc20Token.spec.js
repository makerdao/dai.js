import EthereumTokenService from '../../../src/eth/EthereumTokenService';
import tokens from '../../../contracts/tokens';
import TestAccountProvider from '../../../src/utils/TestAccountProvider';

test('get ERC20 (MKR) balance of address', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().authenticate().then(() => {
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

  ethereumTokenService.manager().authenticate().then(() => {
      const token = ethereumTokenService.getToken(tokens.MKR);
      return token.allowance(TestAccountProvider.nextAddress(), TestAccountProvider.nextAddress());
    })
    .then(allowance => {
      expect(allowance.toString()).toBe('0');
      done();
    });
});

test('approve an ERC20 (MKR) allowance', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService(),
    spender = TestAccountProvider.nextAddress(),
    allowance = '10000';

  let token = null;

  ethereumTokenService.manager().authenticate().then(() => {
      token = ethereumTokenService.getToken(tokens.MKR);
      return token.approve(spender, allowance);
    })
    .then(transaction => {
      expect(!!transaction).toBe(true);
      return token.allowance(ethereumTokenService.get('web3').defaultAccount(), spender);
    })
    .then(result => {
      expect(result.toString()).toBe(allowance);
      done();
    });
});

test('approveUnlimited an ERC20 (MKR) allowance', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().authenticate().then(() => {
      const token = ethereumTokenService.getToken(tokens.MKR);
      return token.approveUnlimited('0x0000000000000000000000000000000000000001');
    })
    .then(transaction => {
      expect(!!transaction).toBe(true);
      done();
    });
});
