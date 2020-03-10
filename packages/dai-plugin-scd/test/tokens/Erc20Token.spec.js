import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';
import { scdMaker } from '../helpers/maker';
import { MKR, WETH } from '../../src/Currency';
import { UINT256_MAX } from '../../src/utils/constants';

let tokenService, mkr, weth, currentAddress, testAddress;

beforeAll(async () => {
  const maker = await scdMaker();
  tokenService = await maker.service('token');
  await tokenService.manager().authenticate();
  mkr = tokenService.getToken(MKR);
  weth = tokenService.getToken(WETH);
  currentAddress = tokenService.get('web3').currentAddress();
});

beforeEach(() => {
  testAddress = TestAccountProvider.nextAddress();
});

test('get ERC20 (MKR) balance of address', async () => {
  const balance = await mkr.balanceOf(TestAccountProvider.nextAddress());
  expect(balance.toString()).toEqual(MKR(0).toString());
});

test('get ERC20 (MKR) allowance of address', async () => {
  const allowance = await mkr.allowance(
    TestAccountProvider.nextAddress(),
    TestAccountProvider.nextAddress()
  );
  expect(allowance.toString()).toEqual(MKR(0).toString());
});

test('approve an ERC20 (MKR) allowance', async () => {
  await mkr.approve(testAddress, 10000);
  let allowance = await mkr.allowance(currentAddress, testAddress);
  expect(allowance.toString()).toEqual(MKR(10000).toString());

  await mkr.approve(testAddress, 0);
  allowance = await mkr.allowance(currentAddress, testAddress);
  expect(allowance.toString()).toEqual(MKR(0).toString());
});

test('approveUnlimited an ERC20 (MKR) allowance', async () => {
  await mkr.approveUnlimited(testAddress);
  const allowance = await mkr.allowance(currentAddress, testAddress);
  expect(allowance.toString()).toEqual(MKR.wei(UINT256_MAX).toString());
});

test('ERC20 transfer should move transferValue from sender to receiver', async () => {
  await weth.deposit('0.1');
  const senderBalance = await weth.balanceOf(currentAddress);
  const receiverBalance = await weth.balanceOf(testAddress);

  await weth.transfer(testAddress, '0.1');
  const newSenderBalance = await weth.balanceOf(currentAddress);
  const newReceiverBalance = await weth.balanceOf(testAddress);

  expect(newSenderBalance).toEqual(senderBalance.minus(0.1));
  expect(newReceiverBalance).toEqual(receiverBalance.plus(0.1));
});

test('ERC20 transferFrom should move transferValue from sender to receiver', async () => {
  await weth.deposit('0.1');
  const senderBalance = await weth.balanceOf(currentAddress);
  const receiverBalance = await weth.balanceOf(testAddress);

  await weth.transferFrom(currentAddress, testAddress, '0.1');
  const newSenderBalance = await weth.balanceOf(currentAddress);
  const newReceiverBalance = await weth.balanceOf(testAddress);

  expect(newSenderBalance).toEqual(senderBalance.minus(0.1));
  expect(newReceiverBalance).toEqual(receiverBalance.plus(0.1));
});

test('totalSupply() should increase when new tokens are minted', async () => {
  const supply1 = await weth.totalSupply();
  await weth.deposit(0.1);
  const supply2 = await weth.totalSupply();
  expect(supply1.plus(0.1)).toEqual(supply2);
});
