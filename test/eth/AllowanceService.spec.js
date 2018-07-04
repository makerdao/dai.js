import tokens from '../../contracts/tokens';
import TestAccountProvider from '../../src/utils/TestAccountProvider';
import { buildTestService } from '../helpers/serviceBuilders';
import { DAI } from '../../src/eth/CurrencyUnits';
import { UINT256_MAX } from '../../src/utils/constants';

let dai, testAddress, allowanceService, owner;

async function buildTestAllowanceService(max = true) {
  allowanceService = buildTestService('allowance', {
    allowance: max ? true : { useMinimizeAllowancePolicy: true }
  });
  await allowanceService.manager().authenticate();
  dai = allowanceService.get('token').getToken(tokens.DAI);
  owner = allowanceService
    .get('token')
    .get('web3')
    .ethersSigner().address;
}

beforeEach(() => {
  testAddress = TestAccountProvider.nextAddress();
});

afterEach(async () => {
  await dai.approve(testAddress, 0);
});

test('max allowance policy, no need to update', async () => {
  await buildTestAllowanceService();
  await dai.approveUnlimited(testAddress);
  await allowanceService.requireAllowance(tokens.DAI, testAddress);

  const allowance = await dai.allowance(owner, testAddress);
  expect(allowance).toEqual(DAI.wei(UINT256_MAX));
});

test('max allowance policy, need to update', async () => {
  await buildTestAllowanceService();
  await dai.approve(testAddress, 0);
  await allowanceService.requireAllowance(tokens.DAI, testAddress);

  const allowance = await dai.allowance(owner, testAddress);
  expect(allowance).toEqual(DAI.wei(UINT256_MAX));
});

test('min allowance policy, need to update', async () => {
  buildTestAllowanceService(false);
  const estimate = DAI(100);
  await dai.approve(testAddress, DAI(50));
  await allowanceService.requireAllowance(tokens.DAI, testAddress, estimate);

  const allowance = await dai.allowance(owner, testAddress);
  expect(allowance).toEqual(estimate);
});

test('min allowance policy, no need to update', async () => {
  await buildTestAllowanceService(false);
  const estimate = DAI(100);
  const initialAllowance = DAI(200);
  await dai.approve(testAddress, initialAllowance);
  await allowanceService.requireAllowance(tokens.DAI, testAddress, estimate);

  const allowance = await dai.allowance(owner, testAddress);
  expect(allowance).toEqual(initialAllowance);
});

test('removeAllowance() works, need to update', async () => {
  await buildTestAllowanceService(false);
  await dai.approve(testAddress, 300);
  await allowanceService.removeAllowance(tokens.DAI, testAddress);

  const allowance = await dai.allowance(owner, testAddress);
  expect(allowance).toEqual(DAI(0));
});

test('removeAllowance() works, no need to update', async () => {
  await buildTestAllowanceService(false);
  await dai.approve(testAddress, 0);
  await allowanceService.removeAllowance(tokens.DAI, testAddress);

  const allowance = await dai.allowance(owner, testAddress);
  expect(allowance).toEqual(DAI(0));
});
