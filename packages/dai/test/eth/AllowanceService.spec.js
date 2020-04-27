import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';
import { buildTestService } from '../helpers/serviceBuilders';
import { SAI } from '../../src/eth/Currency';
import { UINT256_MAX } from '../../src/utils/constants';

let sai, testAddress, allowanceService, owner;

async function buildTestAllowanceService(max = true) {
  allowanceService = buildTestService('allowance', {
    allowance: max ? true : { useMinimizeAllowancePolicy: true }
  });
  await allowanceService.manager().authenticate();
  sai = allowanceService.get('token').getToken(SAI);
  owner = allowanceService
    .get('token')
    .get('web3')
    .currentAddress();
}

beforeEach(() => {
  testAddress = TestAccountProvider.nextAddress();
});

afterEach(async () => {
  if (sai) await sai.approve(testAddress, 0);
});

test('max allowance policy, no need to update', async () => {
  await buildTestAllowanceService();
  await sai.approveUnlimited(testAddress);
  await allowanceService.requireAllowance(SAI, testAddress);

  const allowance = await sai.allowance(owner, testAddress);
  expect(allowance).toEqual(SAI.wei(UINT256_MAX));
});

test('max allowance policy, need to update', async () => {
  await buildTestAllowanceService();
  await sai.approve(testAddress, 0);
  allowanceService.get('event').on('allowance/APPROVE', eventObj => {
    expect(eventObj.payload.transaction.hash).toBeDefined();
  });
  await allowanceService.requireAllowance(SAI, testAddress);

  const allowance = await sai.allowance(owner, testAddress);
  expect(allowance).toEqual(SAI.wei(UINT256_MAX));
});

test('min allowance policy, need to update', async () => {
  buildTestAllowanceService(false);
  const estimate = SAI(100);
  await sai.approve(testAddress, SAI(50));
  allowanceService.get('event').on('allowance/APPROVE', eventObj => {
    expect(eventObj.payload.transaction.hash).toBeDefined();
  });
  await allowanceService.requireAllowance(SAI, testAddress, { estimate });

  const allowance = await sai.allowance(owner, testAddress);
  expect(allowance).toEqual(estimate);
});

test('min allowance policy, no need to update', async () => {
  await buildTestAllowanceService(false);
  const estimate = SAI(100);
  const initialAllowance = SAI(200);
  await sai.approve(testAddress, initialAllowance);
  await allowanceService.requireAllowance(SAI, testAddress, { estimate });

  const allowance = await sai.allowance(owner, testAddress);
  expect(allowance).toEqual(initialAllowance);
});

test('removeAllowance() works, need to update', async () => {
  await buildTestAllowanceService(false);
  await sai.approve(testAddress, 300);
  await allowanceService.removeAllowance(SAI, testAddress);

  const allowance = await sai.allowance(owner, testAddress);
  expect(allowance).toEqual(SAI(0));
});

test('removeAllowance() works, no need to update', async () => {
  await buildTestAllowanceService(false);
  await sai.approve(testAddress, 0);
  await allowanceService.removeAllowance(SAI, testAddress);

  const allowance = await sai.allowance(owner, testAddress);
  expect(allowance).toEqual(SAI(0));
});
