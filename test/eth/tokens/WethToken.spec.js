import EthereumTokenService from '../../../src/eth/EthereumTokenService';
import tokens from '../../../contracts/tokens';
import TestAccountProvider from '../../../src/utils/TestAccountProvider';

const utils = require('ethers').utils;

test('get WETH balance of address', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().authenticate().then(() => {
      const token = ethereumTokenService.getToken(tokens.WETH);
      return token.balanceOf(TestAccountProvider.nextAddress());
    })
    .then(balance =>{
      expect(balance.toString()).toBe('0');
      done();
    });
});

test('get WETH allowance of address', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().authenticate().then(() => {
      const token = ethereumTokenService.getToken(tokens.WETH);
      return token.allowance(TestAccountProvider.nextAddress(), TestAccountProvider.nextAddress());
    })
    .then(allowance => {
      expect(allowance.toString()).toBe('0');
      done();
    });
});

test('token name and symbol are correct', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  let token = null;

  ethereumTokenService.manager().authenticate().then(() => {
      token = ethereumTokenService.getToken(tokens.WETH);
      return token.symbol();
    })
    .then(symbol => {
      expect(symbol).toEqual('WETH');
      return token.name();
    })
    .then(name => {
      expect(name).toBe('Wrapped Ether');
      done();
    });
});

test('wrap and unwrap ETH', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService(),
    parseBalance = b => parseFloat(utils.formatEther(b[0].toString()));

  let token = null, originalBalance = null, owner = null;

  ethereumTokenService.manager().authenticate()
    .then(() => {
      owner = ethereumTokenService.get('web3').defaultAccount();
      token = ethereumTokenService.getToken(tokens.WETH);
      return token.balanceOf(owner);
    })
    .then(b => {
      originalBalance = parseBalance(b);
      return token.deposit(utils.parseEther('0.1'));
    })
    .then(() => token.balanceOf(owner))
    .then(b => {
      expect(parseBalance(b)).toBeCloseTo(originalBalance + 0.1, 12);
      return token.withdraw(utils.parseEther('0.1'));
    })
    .then(() => token.balanceOf(owner))
    .then(b => {
      expect(parseBalance(b)).toBeCloseTo(originalBalance, 12);
      done();
    });
});
