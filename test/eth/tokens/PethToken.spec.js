import EthereumTokenService from '../../../src/eth/EthereumTokenService';
import tokens from '../../../contracts/tokens';
import contracts from '../../../contracts/contracts';
import TestAccountProvider from '../../../src/utils/TestAccountProvider';

test('get PETH balance of address', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  ethereumTokenService.manager().authenticate().then(() => {
    const token = ethereumTokenService.getToken(tokens.PETH);
    return token.balanceOf(TestAccountProvider.nextAddress());
  })
    .then(balance =>{
      expect(balance.toString()).toBe('0.0');
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
      expect(allowance.toString()).toBe('0.0');
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
    const depositTransaction = weth.deposit('0.1');
    return Promise.all([
      peth.balanceOf(owner),
      weth.approveUnlimited(tub.address),
      depositTransaction.onMined()
    ]);
  })
    .then(result => {
      initialBalance = parseFloat(result[0]);
      const joinTransaction = peth.join('0.1');
      return joinTransaction;
    })
    .then(() => {
      const approveTransaction = peth.approveUnlimited(tub.address);
      return Promise.all([
      peth.balanceOf(owner),
      approveTransaction.onMined()
      ]);
    })
    .then(result => {
      expect(parseFloat(result[0])).toBeCloseTo(initialBalance + 0.1, 12);
      const exitTransaction = peth.exit('0.1');
      return exitTransaction.onMined();
    })
    .then(() => peth.balanceOf(owner))
    .then(balance => {
      expect(parseFloat(balance)).toBeCloseTo(initialBalance, 12);
      done();
    });
}, 5000);
