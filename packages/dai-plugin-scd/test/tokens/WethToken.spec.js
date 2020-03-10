import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';
import { WETH } from '../../src/Currency';
import { scdMaker } from '../helpers/maker';
let tokenService, weth;

beforeAll(async () => {
  const maker = await scdMaker();
  tokenService = await maker.service('token');
  await tokenService.manager().authenticate();
  weth = tokenService.getToken(WETH);
});

test('get WETH allowance of address', async () => {
  const allowance = await weth.allowance(
    TestAccountProvider.nextAddress(),
    TestAccountProvider.nextAddress()
  );
  const type = jest.fn();
  const testVal = WETH(0);
  allowance.type = type;
  testVal.type = type;
  expect(allowance).toEqual(testVal);
});

test('token name and symbol are correct', async () => {
  expect(await weth._contract.symbol()).toBe('WETH');
  expect(await weth.name()).toBe('Wrapped Ether');
});

test('wrap and unwrap ETH', async () => {
  const owner = tokenService.get('web3').currentAddress();
  const balance1 = await weth.balanceOf(owner);
  await weth.deposit(0.1);
  const balance2 = await weth.balanceOf(owner);
  expect(balance1.plus(0.1)).toEqual(balance2);
  await weth.withdraw(0.1);
  const balance3 = await weth.balanceOf(owner);
  expect(balance2.minus(0.1)).toEqual(balance3);
});
