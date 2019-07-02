import { mcdMaker } from './helpers';
import { ServiceRoles } from '../src/constants';

let service;
let maker;

beforeAll(async () => {
  maker = await mcdMaker();
  service = maker.service(ServiceRoles.SYSTEM_DATA);
});

test('get annual base rate', async () => {
  // Should this be returning infinity?
  const rate = await service.getAnnualBaseRate();
  expect(rate).toBe(Infinity);
});

test('get system-wide debt ceiling', async () => {
  const ceiling = await service.getSystemWideDebtCeiling();
  expect(ceiling).toBe(1000000);
});
