import { buildTestEthereumTokenService } from '../../helpers/serviceBuilders';
import contracts from '../../../contracts/contracts';
import TestAccountProvider from '../../helpers/TestAccountProvider';
import { WETH, PETH } from '../../../src/eth/Currency';

let tokenService, owner, weth, peth;

beforeAll(async () => {
  tokenService = buildTestEthereumTokenService();
  await tokenService.manager().authenticate();
  owner = tokenService.get('web3').currentAccount();
  weth = tokenService.getToken(WETH);
  peth = tokenService.getToken(PETH);
});

test('get PETH balance of address', async () => {
  const balance = await peth.balanceOf(TestAccountProvider.nextAddress());
  expect(balance).toEqual(PETH(0));
});

test('get PETH allowance of address', async () => {
  const allowance = await peth.allowance(
    TestAccountProvider.nextAddress(),
    TestAccountProvider.nextAddress()
  );
  expect(allowance).toEqual(PETH(0));
});

test('should successfully join and exit PETH', async () => {
  const tub = tokenService
    .get('smartContract')
    .getContractByName(contracts.SAI_TUB);
  await weth.approveUnlimited(tub.address);
  await peth.approveUnlimited(tub.address);

  await weth.deposit(0.1);
  const balance1 = await peth.balanceOf(owner);

  await peth.join(0.1);
  const balance2 = await peth.balanceOf(owner);
  expect(balance1.plus(0.1)).toEqual(balance2);

  await peth.exit(0.1);
  const balance3 = await peth.balanceOf(owner);
  expect(balance2.minus(0.1)).toEqual(balance3);
});

test('should return the wrapper ratio', async () => {
  const ratio = await peth.wrapperRatio();
  expect(ratio).toEqual(WETH(1));
});

test('should return the join price in weth', async () => {
  const price = await peth.joinPrice(3);
  expect(price).toEqual(WETH(3));
});

test('should return the exit price in weth', async () => {
  const price = await peth.exitPrice(2);
  expect(price).toEqual(WETH(2));
});
