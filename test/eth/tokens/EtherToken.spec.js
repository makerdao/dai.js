import EthereumTokenService from '../../../src/eth/EthereumTokenService';
import tokens from '../../../contracts/tokens';
import TestAccountProvider from '../../../src/utils/TestAccountProvider';

const utils = require('ethers').utils;

test('get Ether balance using test blockchain', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().authenticate()
    .then(() => {
      const token =  ethereumTokenService.getToken(tokens.ETH);
      return token.balanceOf(TestAccountProvider.nextAddress());
    })
    .then(balance => {
      expect(utils.formatEther(balance)).toEqual('100.0');
      done();
    });
});

test('get Ether allowance returns max safe integer', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();
  ethereumTokenService.manager().authenticate()
    .then(() => {
      const token = ethereumTokenService.getToken(tokens.ETH);
      return token.allowance(TestAccountProvider.nextAddress(), TestAccountProvider.nextAddress());
    })
    .then(allowance => {
      expect(allowance.toString()).toEqual(Number.MAX_SAFE_INTEGER.toString());
      done();
    });
});
