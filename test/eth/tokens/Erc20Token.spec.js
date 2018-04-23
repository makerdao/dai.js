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
      expect(balance).toEqual('0.0');
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
      expect(allowance).toBe('0.0');
      done();
    });
});

test('approve an ERC20 (MKR) allowance', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService(),
    spender = TestAccountProvider.nextAddress(),
    allowance = '10000.0';

  let token = null;

  ethereumTokenService.manager().authenticate().then(() => {
    token = ethereumTokenService.getToken(tokens.MKR);
    const transactionWrapper = token.approve(spender, allowance);
    return transactionWrapper.onMined();
  })
    .then(()=>{
        return token.allowance(ethereumTokenService.get('web3').defaultAccount(), spender);
    })
    .then(result => {
      expect(result.toString()).toBe(allowance);
      return token.approve(spender, '0'); //reset allowance to 0
    })
    .then(transaction=> transaction.onMined())
    .then(()=>{
      done();
    });
}, 15000);

test('approveUnlimited an ERC20 (MKR) allowance', (done) => {
  const ethereumTokenService = EthereumTokenService.buildTestService(),
    spender = TestAccountProvider.nextAddress();

  let token = null;

  ethereumTokenService.manager().authenticate().then(() => {
    token = ethereumTokenService.getToken(tokens.MKR);
    const TransactionWrapper = token.approveUnlimited(spender);
    return TransactionWrapper.onMined();
  })
    .then(() => {
      return token.allowance(ethereumTokenService.get('web3').defaultAccount(), spender);
    })
    .then(allowance => {
      expect(allowance).toBe(utils.formatUnits(utils.bigNumberify('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').toString(),token.decimals()));
      done();
    });
}, 10000);

test('ERC20 transfer should move transferValue from sender to receiver', done => {
  const ethereumTokenService = EthereumTokenService.buildTestService(),
    receiver = TestAccountProvider.nextAddress();

  let sender = null, token = null, senderBalance = null, receiverBalance = null;

  ethereumTokenService.manager().authenticate().then(() => {
    sender = ethereumTokenService.get('web3').defaultAccount();
    token =  ethereumTokenService.getToken(tokens.WETH);
    return token.deposit('0.1').onMined();
  })
    .then(() => Promise.all([ token.balanceOf(sender), token.balanceOf(receiver) ]))
    .then(balances => {
      senderBalance = parseFloat(balances[0].toString());
      receiverBalance = parseFloat(balances[1].toString());
      const TransactionWrapper = token.transfer(receiver, '0.1');
      return TransactionWrapper.onMined();
    })
    .then(() => Promise.all([ token.balanceOf(sender), token.balanceOf(receiver) ]))
    .then(balances => {
      const newSenderBalance = parseFloat(balances[0].toString()),
        newReceiverBalance = parseFloat(balances[1].toString());

      expect(newSenderBalance).toBeCloseTo(senderBalance - 0.1, 12);
      expect(newReceiverBalance).toBeCloseTo(receiverBalance + 0.1, 12);
      done();
    });
},15000);

test.only('ERC20 transferFrom should move transferValue from sender to receiver', done => {
  const ethereumTokenService = EthereumTokenService.buildTestService(),
    receiver = TestAccountProvider.nextAddress();

  let sender = null, token = null, senderBalance = null, receiverBalance = null;

  ethereumTokenService.manager().authenticate().then(() => {
    sender = ethereumTokenService.get('web3').defaultAccount();
    token =  ethereumTokenService.getToken(tokens.WETH);
    return token.deposit('0.1').onMined();
  })
    .then(() => Promise.all([ token.balanceOf(sender), token.balanceOf(receiver) ]))
    .then(balances => {
      senderBalance = parseFloat(balances[0].toString());
      receiverBalance = parseFloat(balances[1].toString());
      const TransactionWrapper = token.transferFrom(sender, receiver, '0.1');
      return TransactionWrapper.onMined();
    })
    .then(() => Promise.all([ token.balanceOf(sender), token.balanceOf(receiver) ]))
    .then(balances => {
      const newSenderBalance = parseFloat(balances[0].toString()),
        newReceiverBalance = parseFloat(balances[1].toString());

      expect(newSenderBalance).toBeCloseTo(senderBalance - 0.1, 12);
      expect(newReceiverBalance).toBeCloseTo(receiverBalance + 0.1, 12);
      done();
    });
},15000);

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
      initialSupply = parseFloat(supply.toString());
      const TransactionWrapper = token.deposit('0.1');
      return TransactionWrapper.onMined();
    })
    .then(() => {
      return token.totalSupply();
    })
    .then(supply => {
      const newSupply = parseFloat(supply.toString());
      expect(newSupply).toBeCloseTo(initialSupply + 0.1, 12);
      done();
    });
}, 15000);


