import { mcdMaker, setupCollateral } from './helpers';
import { ETH, BAT, MDAI } from '../src';
import { toHex } from '../src/utils';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import schemas, { totalEncumberedDebt, debtScalingFactor } from '../src/schema';
import { first } from 'rxjs/operators';
import { ServiceRoles } from '../src/constants';

let mcall,
  maker,
  watcher,
  proxyAddress,
  snapshotData,
  cdpMgr,
  cdpTypeService,
  vault;

const ETH_A_COLLATERAL_AMOUNT = ETH(1);
const ETH_A_DEBT_AMOUNT = MDAI(1);

const BAT_A_COLLATERAL_AMOUNT = BAT(1);
const BAT_A_DEBT_AMOUNT = MDAI(1);

const setupFn = async () => {
  await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
  await setupCollateral(maker, 'BAT-A', { price: 5, debtCeiling: 50 });

  const mgr = await maker.service(ServiceRoles.CDP_MANAGER);
  await mgr.openLockAndDraw(
    'ETH-A',
    ETH_A_COLLATERAL_AMOUNT,
    ETH_A_DEBT_AMOUNT
  );
  await mgr.openLockAndDraw(
    'BAT-A',
    BAT_A_COLLATERAL_AMOUNT,
    BAT_A_DEBT_AMOUNT
  );
};

beforeAll(async () => {
  maker = await mcdMaker({
    cdpTypes: [
      { currency: ETH, ilk: 'ETH-A' },
      { currency: BAT, ilk: 'BAT-A' }
    ],
    multicall: true
  });

  mcall = maker.service('multicall');
  watcher = mcall.createWatcher({ interval: 'block' });
  mcall.registerSchemas(schemas);
  mcall.start();
  cdpMgr = maker.service(ServiceRoles.CDP_MANAGER);
  cdpTypeService = maker.service(ServiceRoles.CDP_TYPE);

  vault = await setupFn();
  snapshotData = await takeSnapshot(maker);
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(totalEncumberedDebt, async () => {
  const totalEncumberedDebt$ = mcall.watchObservable(
    totalEncumberedDebt,
    'ETH-A'
  );
  const res = await totalEncumberedDebt$.pipe(first()).toPromise();
  console.log(res.toString());
});

test(debtScalingFactor, async () => {
  const debtScalingFactor$ = mcall.watchObservable(debtScalingFactor, 'ETH-A');
  const res = await debtScalingFactor$.pipe(first()).toPromise();
  console.log(res);
});
