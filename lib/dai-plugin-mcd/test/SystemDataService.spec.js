import { mcdMaker } from './helpers';

let service;

beforeAll(async () => {
  const maker = await mcdMaker();
  service = maker.service('systemData');
});

test('get annual savings rate', async () => {
  const rate = await service.getAnnualSavingsRate();
  expect(rate).toBe(0);
});

test('get system-wide debt ceiling', async () => {
  const ceiling = await service.getSystemWideDebtCeiling();
  expect(ceiling).toBe(0);
});
