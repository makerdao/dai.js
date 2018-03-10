import EthereumTokenService from '../../src/eth/EthereumTokenService';
import tokens from '../../contracts/tokens';
import TestAccountProvider from '../../src/utils/TestAccountProvider';

const utils = require('ethers').utils;

test('getTokens returns tokens', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().connect()
    .then(() => {
      const tokensList = ethereumTokenService.getTokens();
      expect(tokensList.includes(tokens.DAI)).toBe(true);
      expect(tokensList.includes(tokens.MKR)).toBe(true);
      done();
    });
});

test('getTokenVersions returns token versions using remote blockchain', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().connect()
    .then(() => {
      const tokenVersions = ethereumTokenService.getTokenVersions();
      expect(tokenVersions[tokens.MKR]).toEqual([1,2]);
      expect(tokenVersions[tokens.DAI]).toEqual([1]);
      done();
    });
});

test('getToken throws when given unknown token symbol', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().connect()
    .then(() => {
      expect(() => ethereumTokenService.getToken('XYZ')).toThrow();
      done();
    });
});

test('get ERC20 (MKR) balance of address', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().connect()
    .then(() => {
      const token = ethereumTokenService.getToken(tokens.MKR);
      return token.balanceOf('0x0000000000000000000000000000000000000001');
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
      return token.allowance('0x0000000000000000000000000000000000000001', '0x0000000000000000000000000000000000000002');
    })
    .then(allowance => {
      expect(allowance.toString()).toBe('0');
      done();
    });
});

test('get Ether balance using test blockchain', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().connect()
    .then(() => {
      const token =  ethereumTokenService.getToken(tokens.ETH);
      return token.balanceOf(TestAccountProvider.nextAddress()); //update to check balance of account with ether
    })
    .then(balance => {
      expect(utils.formatEther(balance)).toEqual('100.0');
      done();
    });
});

test('get Ether allowance returns max safe integer', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();
  ethereumTokenService.manager().connect()
    .then(() => {
      const token = ethereumTokenService.getToken(tokens.ETH); //this isn't asynch
      return token.allowance('0x0000000000000000000000000000000000000001', '0x0000000000000000000000000000000000000002');
    })
    .then(allowance => {
      expect(allowance.toString()).toEqual(Number.MAX_SAFE_INTEGER.toString());
      done();
    });
});
