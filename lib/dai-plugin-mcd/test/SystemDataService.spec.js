import { mcdMaker, setDebtCeiling, setBaseRate } from './helpers';
import { ServiceRoles } from '../src/constants';
import { MDAI } from '../src';
import { RAY } from '@makerdao/dai/utils/constants';
import BigNumber from 'bignumber.js';

let service;
let maker;

beforeAll(async () => {
  maker = await mcdMaker();
  service = maker.service(ServiceRoles.SYSTEM_DATA);
});

test('get annual base rate', async () => {
  const amount = BigNumber(0.01).multipliedBy(RAY);
  await setBaseRate(maker, amount);
  const rate = await service.getAnnualBaseRate();
  expect(rate).toBe(0.01);
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
