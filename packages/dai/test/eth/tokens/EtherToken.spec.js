import { buildTestEthereumTokenService } from '../../helpers/serviceBuilders';
import { ETH } from '../../../src/eth/Currency';
import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';

test('get Ether allowance returns max safe integer', done => {
  const ethereumTokenService = buildTestEthereumTokenService();
  ethereumTokenService
    .manager()
    .authenticate()
    .then(() => {
      const token = ethereumTokenService.getToken(ETH);
      return token.allowance(
        TestAccountProvider.nextAddress(),
        TestAccountProvider.nextAddress()
      );
    })
    .then(allowance => {
      expect(allowance.toString()).toEqual(Number.MAX_SAFE_INTEGER.toString());
      done();
    });
});

test('get Ether balance using test blockchain', done => {
  const ethereumTokenService = buildTestEthereumTokenService();

  ethereumTokenService
    .manager()
    .authenticate()
    .then(() => {
      const token = ethereumTokenService.getToken(ETH);
      return token.balanceOf(TestAccountProvider.nextAddress());
    })
    .then(balance => {
      expect(balance).toEqual(ETH(100));
      done();
    });
});

test('approve and approveUnlimited should resolve to true', done => {
  const ethereumTokenService = buildTestEthereumTokenService();

  let token = null;

  ethereumTokenService
    .manager()
    .authenticate()
    .then(() => {
      token = ethereumTokenService.getToken(ETH);
      return token.approve(TestAccountProvider.nextAddress(), '0.1');
    })
    .then(result => {
      expect(result).toBe(true);
      return token.approveUnlimited(TestAccountProvider.nextAddress());
    })
    .then(result => {
      expect(result).toBe(true);
      done();
    });
});

test('ether transfer should move transferValue from sender to receiver', done => {
  const ethereumTokenService = buildTestEthereumTokenService(),
    receiver = TestAccountProvider.nextAddress();

  let sender = null,
    token = null,
    senderBalance = null,
    receiverBalance = null;

  ethereumTokenService
    .manager()
    .authenticate()
    .then(() => {
      sender = ethereumTokenService.get('web3').currentAddress();
      token = ethereumTokenService.getToken(ETH);
      return Promise.all([token.balanceOf(sender), token.balanceOf(receiver)]);
    })
    .then(balances => {
      senderBalance = ETH(balances[0]);
      receiverBalance = ETH(balances[1]);
      return token.transfer(receiver, '0.1');
    })
    .then(() => {
      return Promise.all([token.balanceOf(sender), token.balanceOf(receiver)]);
    })
    .then(balances => {
      const newSenderBalance = ETH(balances[0]),
        newReceiverBalance = ETH(balances[1]);
      expect(newReceiverBalance.minus(0.1).eq(receiverBalance)).toBeTruthy();
      // sender also pays tx fee, so their balance is lower
      expect(newSenderBalance.plus(0.1).toNumber()).toBeCloseTo(
        senderBalance.toNumber(),
        2
      );
      done();
    });
});

test('ether transferFrom should move transferValue from sender to receiver', done => {
  const ethereumTokenService = buildTestEthereumTokenService(),
    receiver = TestAccountProvider.nextAddress();

  let sender = null,
    token = null,
    senderBalance = null,
    receiverBalance = null;

  ethereumTokenService
    .manager()
    .authenticate()
    .then(() => {
      sender = ethereumTokenService.get('web3').currentAddress();
      token = ethereumTokenService.getToken(ETH);
      return Promise.all([token.balanceOf(sender), token.balanceOf(receiver)]);
    })
    .then(balances => {
      senderBalance = ETH(balances[0]);
      receiverBalance = ETH(balances[1]);
      return token.transferFrom(sender, receiver, '0.1');
    })
    .then(() => {
      return Promise.all([token.balanceOf(sender), token.balanceOf(receiver)]);
    })
    .then(balances => {
      const newSenderBalance = ETH(balances[0]),
        newReceiverBalance = ETH(balances[1]);
      expect(newReceiverBalance.minus(0.1).eq(receiverBalance)).toBeTruthy();
      // sender also pays tx fee, so their balance is lower
      expect(newSenderBalance.plus(0.1).toNumber()).toBeCloseTo(
        senderBalance.toNumber(),
        2
      );
      done();
    });
});
