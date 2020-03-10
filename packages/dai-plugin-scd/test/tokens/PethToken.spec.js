import contracts from '../../contracts/contracts';
import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';
import { WETH, PETH } from '../../src/Currency';
import { scdMaker } from '../helpers/maker';

let tokenService, owner, weth, peth;

beforeAll(async () => {
  const maker = await scdMaker();
  tokenService = await maker.service('token');
  await tokenService.manager().authenticate();
  owner = tokenService.get('web3').currentAddress();
  weth = tokenService.getToken(WETH);
  peth = tokenService.getToken(PETH);
});

test('get PETH balance of address', async () => {
  const balance = await peth.balanceOf(TestAccountProvider.nextAddress());
  const type = jest.fn();
  const testVal = PETH(0);
  balance.type = type;
  testVal.type = type;
  expect(balance).toEqual(testVal);
});

test('get PETH allowance of address', async () => {
  const allowance = await peth.allowance(
    TestAccountProvider.nextAddress(),
    TestAccountProvider.nextAddress()
  );
  const type = jest.fn();
  const testVal = PETH(0);
  allowance.type = type;
  testVal.type = type;
  expect(allowance).toEqual(testVal);
});

test('should successfully join and exit PETH', async () => {
  const tub = tokenService.get('smartContract').getContract(contracts.SAI_TUB);
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
  const type = jest.fn();
  const testVal = WETH(1);
  ratio.type = type;
  testVal.type = type;
  expect(ratio).toEqual(testVal);
});

test('should return the join price in weth', async () => {
  const price = await peth.joinPrice(3);
  const type = jest.fn();
  const testVal = WETH(3);
  price.type = type;
  testVal.type = type;
  expect(price).toEqual(testVal);
});

test('should return the exit price in weth', async () => {
  const price = await peth.exitPrice(2);
  const type = jest.fn();
  const testVal = WETH(2);
  price.type = type;
  testVal.type = type;
  expect(price).toEqual(testVal);
});
