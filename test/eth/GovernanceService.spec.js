import GovernanceService from '../../src/eth/GovernanceService';
import { setupTestServices } from '../helpers';
import { utils } from 'ethers';
import { unray } from '../../src/utils/math';

let gov;

beforeAll(async () => {
  gov = new GovernanceService();
  setupTestServices(gov.manager(), ['smartContract']);
  return gov.manager().authenticate();
});

test('can read liquidation ratio', async () => {
  const mat = await gov.getLiquidationRatio();
  expect(unray(mat).toString()).toEqual('1.5');
});

test('can read debt ceiling', async () => {
  const cap = await gov.getDebtCeiling();
  expect(utils.formatEther(cap)).toEqual('1000.0');
});

test('can set debt ceiling', async () => {
  const newval = utils.parseEther('1234');
  console.log(newval.toString());
  await gov.setDebtCeiling(newval);
  console.log('here');
  expect(utils.formatEther(await gov.getDebtCeiling())).toEqual('2000.0');
});
