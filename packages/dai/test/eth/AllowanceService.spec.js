import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';
import { buildTestService } from '../helpers/serviceBuilders';
import { WETH } from '../../src/eth/Currency';
import { UINT256_MAX } from '../../src/utils/constants';

let token, testAddress, allowanceService, owner;

async function buildTestAllowanceService(max = true) {
  allowanceService = buildTestService('allowance', {
    allowance: max ? true : { useMinimizeAllowancePolicy: true }
  });
  await allowanceService.manager().authenticate();
  token = allowanceService.get('token').getToken('WETH');
  owner = allowanceService
    .get('token')
    .get('web3')
    .currentAddress();
}

beforeEach(() => {
  testAddress = TestAccountProvider.nextAddress();
});

afterEach(async () => {
  if (token) await token.approve(testAddress, 0);
});

test('max allowance policy, no need to update', async () => {
  await buildTestAllowanceService();
  await token.approveUnlimited(testAddress);
  await allowanceService.requireAllowance('WETH', testAddress);

  const allowance = await token.allowance(owner, testAddress);
  expect(allowance).toEqual(WETH.wei(UINT256_MAX));
});

test('max allowance policy, need to update', async () => {
  await buildTestAllowanceService();
  await token.approve(testAddress, 0);
  allowanceService.get('event').on('allowance/APPROVE', eventObj => {
    expect(eventObj.payload.transaction.hash).toBeDefined();
  });
  await allowanceService.requireAllowance(WETH, testAddress);

  const allowance = await token.allowance(owner, testAddress);
  expect(allowance).toEqual(WETH.wei(UINT256_MAX));
});

test('min allowance policy, need to update', async () => {
  buildTestAllowanceService(false);
  const estimate = WETH(100);
  await token.approve(testAddress, WETH(50));
  allowanceService.get('event').on('allowance/APPROVE', eventObj => {
    expect(eventObj.payload.transaction.hash).toBeDefined();
  });
  await allowanceService.requireAllowance(WETH, testAddress, { estimate });

  const allowance = await token.allowance(owner, testAddress);
  expect(allowance).toEqual(estimate);
});

test('min allowance policy, no need to update', async () => {
  await buildTestAllowanceService(false);
  const estimate = WETH(100);
  const initialAllowance = WETH(200);
  await token.approve(testAddress, initialAllowance);
  await allowanceService.requireAllowance(WETH, testAddress, { estimate });

  const allowance = await token.allowance(owner, testAddress);
  expect(allowance).toEqual(initialAllowance);
});

test('removeAllowance() works, need to update', async () => {
  await buildTestAllowanceService(false);
  await token.approve(testAddress, 300);
  await allowanceService.removeAllowance(WETH, testAddress);

  const allowance = await token.allowance(owner, testAddress);
  expect(allowance).toEqual(WETH(0));
});

test('removeAllowance() works, no need to update', async () => {
  await buildTestAllowanceService(false);
  await token.approve(testAddress, 0);
  await allowanceService.removeAllowance(WETH, testAddress);

  const allowance = await token.allowance(owner, testAddress);
  expect(allowance).toEqual(WETH(0));
});
