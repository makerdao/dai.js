import { mcdMaker, setupCollateral } from '../helpers';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { ETH, BAT, MDAI } from '../../src';
import { ServiceRoles } from '../../src/constants';

import schemas, { VAULT_URN, VAULT_ILK } from '../../src/schemas';

let maker, snapshotData, cdpMgr;

const ETH_A_COLLATERAL_AMOUNT = ETH(1);
const ETH_A_DEBT_AMOUNT = MDAI(1);
const ETH_A_PRICE = 180;

beforeAll(async () => {
  maker = await mcdMaker({
    cdpTypes: [
      { currency: ETH, ilk: 'ETH-A' },
      { currency: BAT, ilk: 'BAT-A' }
    ],
    multicall: true
  });

  snapshotData = await takeSnapshot(maker);
  maker.service('multicall').createWatcher({ interval: 'block' });
  maker.service('multicall').registerSchemas(schemas);
  maker.service('multicall').start();
  await setupCollateral(maker, 'ETH-A', {
    price: ETH_A_PRICE
  });

  cdpMgr = await maker.service(ServiceRoles.CDP_MANAGER);
  const dai = maker.getToken(MDAI);
  const _proxyAddress = await maker.service('proxy').ensureProxy();
  await dai.approveUnlimited(_proxyAddress);

  await cdpMgr.openLockAndDraw(
    'ETH-A',
    ETH_A_COLLATERAL_AMOUNT,
    ETH_A_DEBT_AMOUNT
  );
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(VAULT_URN, async () => {
  const cdpId = 1;
  const expected = '0x6D43e8f5A6D2b5aD2b242A1D3CF957C71AfC48a1';
  const urn = await maker.latest(VAULT_URN, cdpId);
  expect(urn).toEqual(expected);
});

test(VAULT_ILK, async () => {
  const cdpId = 1;
  const expected = 'ETH-A';
  const ilk = await maker.latest(VAULT_ILK, cdpId);
  expect(ilk).toEqual(expected);
});
