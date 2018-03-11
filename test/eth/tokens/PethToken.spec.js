import EthereumTokenService from '../../../src/eth/EthereumTokenService';
import tokens from '../../../contracts/tokens';
import contracts from '../../../contracts/contracts';
import TestAccountProvider from '../../../src/utils/TestAccountProvider';

const utils = require('ethers').utils;

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

test('should successfully join and exit PETH', done => {
  const tokenService = EthereumTokenService.buildTestService();
  let weth = null, peth = null, tub = null, owner = null, initialBalance = null;

  tokenService.manager().authenticate().then(() => {
      tub = tokenService.get('smartContract').getContractByName(contracts.TUB);
      owner = tokenService.get('web3').defaultAccount();
      weth = tokenService.getToken(tokens.WETH);
      peth = tokenService.getToken(tokens.PETH);

      return Promise.all([
        peth.balanceOf(owner),
        weth.approveUnlimited(tub.address),
        weth.deposit(utils.parseEther('0.1'))
      ]);
    })
    .then(result => {
      initialBalance = parseFloat(utils.formatEther(result[0]));
      return peth.join(utils.parseEther('0.1'));
    })
    .then(() => Promise.all([
      peth.balanceOf(owner),
      peth.approveUnlimited(tub.address)
    ]))
    .then(result => {
      expect(parseFloat(utils.formatEther(result[0]))).toBeCloseTo(initialBalance + 0.1, 12);
      return peth.exit(utils.parseEther('0.1'));
    })
    .then(() => peth.balanceOf(owner))
    .then(balance => {
      expect(parseFloat(utils.formatEther(balance))).toBeCloseTo(initialBalance, 12);
      done();
    });
});
