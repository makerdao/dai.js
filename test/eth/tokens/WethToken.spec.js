import { buildTestEthereumTokenService } from '../../helpers/serviceBuilders';
import TestAccountProvider from '../../helpers/TestAccountProvider';
import { WETH } from '../../../src/eth/Currency';

let tokenService, weth;

beforeAll(async () => {
  tokenService = buildTestEthereumTokenService();
  await tokenService.manager().authenticate();
  weth = tokenService.getToken(WETH);
});

test('get WETH allowance of address', async () => {
  const allowance = await weth.allowance(
    TestAccountProvider.nextAddress(),
    TestAccountProvider.nextAddress()
  );
  expect(allowance).toEqual(WETH(0));
});

test('token name and symbol are correct', async () => {
  expect(await weth._contract.symbol()).toBe('WETH');
  expect(await weth.name()).toBe('Wrapped Ether');
});

test('wrap and unwrap ETH', async () => {
  const owner = tokenService.get('web3').currentAccount();
  const balance1 = await weth.balanceOf(owner);
  await weth.deposit(0.1);
  const balance2 = await weth.balanceOf(owner);
  expect(balance1.plus(0.1)).toEqual(balance2);
  await weth.withdraw(0.1);
  const balance3 = await weth.balanceOf(owner);
  expect(balance2.minus(0.1)).toEqual(balance3);
});
