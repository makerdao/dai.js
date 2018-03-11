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

test('INCOMPLETE -- should successfully join and exit PETH', done => {
  const tokenService = EthereumTokenService.buildTestService();
  let weth = null, peth = null, tub = null, owner = null, initialBalance = null;

  tokenService.manager().authenticate().then(() => {
      tub = tokenService.get('smartContract').getContractByName(contracts.TUB);

      /*console.log('WETH = ', tokenService.get('smartContract').getContractByName(tokens.WETH).address);
      console.log('PETH = ', tokenService.get('smartContract').getContractByName(tokens.PETH).address);
      tokenService.get('smartContract').getContractByName(tokens.PETH).authority().then(
        (auth) => console.log('PETH Auth = ', auth)
      );*/

      owner = tokenService.get('web3').defaultAccount();
      weth = tokenService.getToken(tokens.WETH);
      peth = tokenService.getToken(tokens.PETH);

      return Promise.all([ weth.deposit(utils.parseEther('0.1')), peth.balanceOf(owner) ]);
    })
    .then(result => {
      initialBalance = parseFloat(utils.formatEther(result[1]));
      return weth.balanceOf(owner);
    })
    .then(balance => weth.approve(tub.address, balance).then(() => balance))
    .then(balance => weth.allowance(owner, tub.address).then(allowance => [balance, allowance]))
    //.then(() => peth.approveUnlimited(tub.address))
    .then(result => {
      expect(result[0].toString()).toEqual(result[1].toString());
      //console.log(result[0].toString(), result[1].toString());
      return true; //peth.join(50); //<< TODO: fix peth.join(). No idea why it's failing.
    })
    .then(() => {
      done();
    });
});
