import EthereumTokenService from '../../../src/eth/EthereumTokenService';
import tokens from '../../../contracts/tokens';
import TestAccountProvider from '../../../src/utils/TestAccountProvider';

const utils = require('ethers').utils;

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
    .then(transaction => { //does this not need to be a promise??
      expect(!!transaction).toBe(true);
      return transaction.state().onConfirmedPromise();
    })
    .then(()=>{
        return token.allowance(ethereumTokenService.get('web3').defaultAccount(), spender);
    })
    .then(result => {
      expect(result.toString()).toBe(allowance);
      done();
    });
}, 10000);

test('approveUnlimited an ERC20 (MKR) allowance', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService(),
    spender = TestAccountProvider.nextAddress();

  let token = null;

  ethereumTokenService.manager().authenticate().then(() => {
    token = ethereumTokenService.getToken(tokens.MKR);
    return token.approveUnlimited(spender);
  })
    .then(transaction => {
      expect(!!transaction).toBe(true);
      done();
      return token.allowance(ethereumTokenService.get('web3').defaultAccount(), spender);
    })
    .then(allowance => {
      expect(allowance.toHexString()).toBe('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      done();
    });
});

test('ERC20 transfer should move transferValue from sender to receiver', done => {
  const ethereumTokenService = EthereumTokenService.buildTestService(),
    receiver = TestAccountProvider.nextAddress();

  let sender = null, token = null, senderBalance = null, receiverBalance = null;

  ethereumTokenService.manager().authenticate().then(() => {
    sender = ethereumTokenService.get('web3').defaultAccount();
    token =  ethereumTokenService.getToken(tokens.WETH);
    return token.deposit(utils.parseEther('0.1'));
  })
    .then(() => Promise.all([ token.balanceOf(sender), token.balanceOf(receiver) ]))
    .then(balances => {
      senderBalance = parseFloat(utils.formatEther(balances[0].toString()));
      receiverBalance = parseFloat(utils.formatEther(balances[1].toString()));
      return token.transfer(sender, receiver, utils.parseEther('0.1').toString());
    })
    .then(() => Promise.all([ token.balanceOf(sender), token.balanceOf(receiver) ]))
    .then(balances => {
      const newSenderBalance = parseFloat(utils.formatEther(balances[0].toString())),
        newReceiverBalance = parseFloat(utils.formatEther(balances[1].toString()));

      expect(newSenderBalance).toBeCloseTo(senderBalance - 0.1, 12);
      expect(newReceiverBalance).toBeCloseTo(receiverBalance + 0.1, 12);
      done();
    });
});

test('totalSupply() should increase when new tokens are minted', done => {
  const ethereumTokenService = EthereumTokenService.buildTestService();

  // eslint-disable-next-line
  let sender = null, token = null, initialSupply = null;

  ethereumTokenService.manager().authenticate().then(() => {
    sender = ethereumTokenService.get('web3').defaultAccount();
    token =  ethereumTokenService.getToken(tokens.WETH);
    return token.totalSupply();
  })
    .then(supply => {
      initialSupply = parseFloat(utils.formatEther(supply.toString()));
      return token.deposit(utils.parseEther('0.1'));
    })
    .then(() => token.totalSupply())
    .then(supply => {
      const newSupply = parseFloat(utils.formatEther(supply.toString()));
      expect(newSupply).toBeCloseTo(initialSupply + 0.1, 12);
      done();
    });
});