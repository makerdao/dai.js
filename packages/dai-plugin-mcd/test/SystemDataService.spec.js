import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';

import { mcdMaker, setupCollateral } from './helpers';
import { ServiceRoles } from '../src/constants';
import { DAI, ETH } from '../src/index';

let service, snapshotData, maker;

beforeAll(async () => {
  maker = await mcdMaker();
  service = maker.service(ServiceRoles.SYSTEM_DATA);
  snapshotData = await takeSnapshot(maker);
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test('get annual base rate', async () => {
  const rate = await service.getAnnualBaseRate();
  expect(rate).toBe(0);
});

test('get system-wide debt ceiling', async () => {
  const ceiling = await service.getSystemWideDebtCeiling();
  expect(ceiling).toBe(1000000);
});

test('get global settlement status', async () => {
  const cage = await service.isGlobalSettlementInvoked();
  expect(cage).toBe(false);
});

test('get system surplus', async () => {
  const surplus = await service.getSystemSurplus();
  expect(surplus).toEqual(DAI(0)); //TODO change to expect non-zero number
});

test('get total dai', async () => {
  expect((await service.getTotalDai()).toNumber()).toEqual(DAI(0).toNumber());
  await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
  await maker
    .service(ServiceRoles.CDP_MANAGER)
    .openLockAndDraw('ETH-A', ETH(1), DAI(3));
  expect((await service.getTotalDai()).toNumber()).toBe(DAI(3).toNumber());
});
