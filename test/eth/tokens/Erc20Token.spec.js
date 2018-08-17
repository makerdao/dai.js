import TestAccountProvider from '../../helpers/TestAccountProvider';
import { buildTestEthereumTokenService } from '../../helpers/serviceBuilders';
import { MKR, WETH } from '../../../src/eth/Currency';
import { UINT256_MAX } from '../../../src/utils/constants';

let tokenService, mkr, weth, currentAccount, testAddress;

beforeAll(async () => {
  tokenService = buildTestEthereumTokenService();
  await tokenService.manager().authenticate();
  mkr = tokenService.getToken(MKR);
  weth = tokenService.getToken(WETH);
  currentAccount = tokenService.get('web3').currentAccount();
});

beforeEach(() => {
  testAddress = TestAccountProvider.nextAddress();
});

test('get ERC20 (MKR) balance of address', async () => {
  const balance = await mkr.balanceOf(TestAccountProvider.nextAddress());
  expect(balance).toEqual(MKR(0));
});

test('get ERC20 (MKR) allowance of address', async () => {
  const allowance = await mkr.allowance(
    TestAccountProvider.nextAddress(),
    TestAccountProvider.nextAddress()
  );
  expect(allowance).toEqual(MKR(0));
});

test('approve an ERC20 (MKR) allowance', async () => {
  await mkr.approve(testAddress, 10000);
  let allowance = await mkr.allowance(currentAccount, testAddress);
  expect(allowance).toEqual(MKR(10000));

  await mkr.approve(testAddress, 0);
  allowance = await mkr.allowance(currentAccount, testAddress);
  expect(allowance).toEqual(MKR(0));
});

test('approveUnlimited an ERC20 (MKR) allowance', async () => {
  await mkr.approveUnlimited(testAddress);
  const allowance = await mkr.allowance(currentAccount, testAddress);
  expect(allowance).toEqual(MKR.wei(UINT256_MAX));
});

test('ERC20 transfer should move transferValue from sender to receiver', async () => {
  await weth.deposit('0.1');
  const senderBalance = await weth.balanceOf(currentAccount);
  const receiverBalance = await weth.balanceOf(testAddress);

  await weth.transfer(testAddress, '0.1');
  const newSenderBalance = await weth.balanceOf(currentAccount);
  const newReceiverBalance = await weth.balanceOf(testAddress);

  expect(newSenderBalance).toEqual(senderBalance.minus(0.1));
  expect(newReceiverBalance).toEqual(receiverBalance.plus(0.1));
});

test('ERC20 transferFrom should move transferValue from sender to receiver', async () => {
  await weth.deposit('0.1');
  const senderBalance = await weth.balanceOf(currentAccount);
  const receiverBalance = await weth.balanceOf(testAddress);

  await weth.transferFrom(currentAccount, testAddress, '0.1');
  const newSenderBalance = await weth.balanceOf(currentAccount);
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
