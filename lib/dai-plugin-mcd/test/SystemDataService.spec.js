import { mcdMaker, setDebtCeiling } from './helpers';
import { ServiceRoles } from '../src/constants';
import { MDAI } from '../src';

let service;
let maker;

beforeAll(async () => {
  maker = await mcdMaker();
  service = maker.service(ServiceRoles.SYSTEM_DATA);
});

test('get annual base rate', async () => {
  const rate = await service.getAnnualBaseRate();
  expect(rate).toBe(0);
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
