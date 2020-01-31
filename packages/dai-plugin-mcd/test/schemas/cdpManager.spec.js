import { mcdMaker, setupCollateral } from '../helpers';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { ETH, BAT, MDAI } from '../../src';
import { ServiceRoles } from '../../src/constants';
import BigNumber from 'bignumber.js';

import {
  VAULT_ADDRESS,
  VAULT_TYPE,
  VAULTS_CREATED,
  VAULT_OWNER,
  TOTAL_OWNED_VAULTS
} from '../../src/schemas';

import cdpManagerSchemas from '../../src/schemas/cdpManager';

let maker, snapshotData, cdpMgr, proxyAddress;

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
  maker.service('multicall').registerSchemas(cdpManagerSchemas);
  maker.service('multicall').start();
  await setupCollateral(maker, 'ETH-A', {
    price: ETH_A_PRICE
  });

  cdpMgr = await maker.service(ServiceRoles.CDP_MANAGER);
  const dai = maker.getToken(MDAI);
  proxyAddress = await maker.service('proxy').ensureProxy();
  await dai.approveUnlimited(proxyAddress);

  await cdpMgr.openLockAndDraw(
    'ETH-A',
    ETH_A_COLLATERAL_AMOUNT,
    ETH_A_DEBT_AMOUNT
  );
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(VAULT_ADDRESS, async () => {
  const cdpId = 1;
  const expected = '0x6D43e8f5A6D2b5aD2b242A1D3CF957C71AfC48a1';
  const vaultAddress = await maker.latest(VAULT_ADDRESS, cdpId);
  expect(vaultAddress).toEqual(expected);
});

test(VAULT_TYPE, async () => {
  expect.assertions(3);

  const cdpId1 = 1;
  const expected1 = 'ETH-A';
  const vaultType1 = await maker.latest(VAULT_TYPE, cdpId1);
  expect(vaultType1).toEqual(expected1);

  const cdpId2 = 9000;
  const vaultType2 = maker.latest(VAULT_TYPE, cdpId2);
  await expect(vaultType2).rejects.toThrow(/does not exist/i);

  const cdpId3 = -9000;
  expect(() => {
    maker.latest(VAULT_TYPE, cdpId3);
  }).toThrow(/invalid vault id/i);
});

test(VAULTS_CREATED, async () => {
  const vaultsCreated = await maker.latest(VAULTS_CREATED);
  expect(vaultsCreated).toEqual(BigNumber('1'));
});

test(VAULT_OWNER, async () => {
  const vaultOwner = await maker.latest(VAULT_OWNER, 1);
  expect(vaultOwner).toEqual(proxyAddress);
});
