import { mcdMaker, setDebtCeiling, setBaseRate } from './helpers';
import { RAY, ServiceRoles } from '../src/constants';
import { MDAI } from '../src';
import BigNumber from 'bignumber.js';

let service;
let maker;

beforeAll(async () => {
  maker = await mcdMaker();
  service = maker.service(ServiceRoles.SYSTEM_DATA);
});

test('get annual base rate', async () => {
  const amount = BigNumber(0.000000000472114805215157978).multipliedBy(RAY);
  await setBaseRate(maker, amount);
  const rate = await service.getAnnualBaseRate();
  expect((rate*100).toFixed(1)).toBe('1.5');
});

test('get system-wide debt ceiling', async () => {
  const ceiling = await service.getSystemWideDebtCeiling();
  expect(ceiling).toBe(0);
});

test('get system-wide debt ceiling at 10 trillion', async () => {
  const tenTrillionAndOneDai = MDAI(Math.pow(10, 13) + 1);
  await setDebtCeiling(maker, MDAI(tenTrillionAndOneDai));
  const ceiling = await service.getSystemWideDebtCeiling();
  expect(ceiling).toBe(tenTrillionAndOneDai.toNumber());
});
