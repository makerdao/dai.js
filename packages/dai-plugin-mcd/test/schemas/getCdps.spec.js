import { mcdMaker, setupCollateral } from '../helpers';
import { CDP_MANAGER } from '../../contracts/addresses/testnet';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { ServiceRoles } from '../../src/constants';
import { ETH, BAT, MDAI } from '../../src';

import {
  USER_VAULT_IDS,
  USER_VAULT_ADDRESSES,
  USER_VAULT_TYPES
} from '../../src/schemas';

import getCdpsSchemas from '../../src/schemas/getCdps';

let maker, snapshotData, proxyAddress, mgr, ethCdp, batCdp;

const ETH_A_COLLATERAL_AMOUNT = ETH(1);
const ETH_A_DEBT_AMOUNT = MDAI(1);
const ETH_A_PRICE = 180;

const BAT_A_COLLATERAL_AMOUNT = BAT(1);
const BAT_A_DEBT_AMOUNT = MDAI(1);
const BAT_A_PRICE = 40;

beforeAll(async () => {
  maker = await mcdMaker({
    multicall: true
  });
  mgr = await maker.service(ServiceRoles.CDP_MANAGER);
  const dai = maker.getToken(MDAI);

  snapshotData = await takeSnapshot(maker);
  proxyAddress = await maker.service('proxy').ensureProxy();
  maker.service('multicall').createWatcher();
  maker.service('multicall').registerSchemas(getCdpsSchemas);
  maker.service('multicall').start();
  await setupCollateral(maker, 'ETH-A', {
    price: ETH_A_PRICE
  });
  await setupCollateral(maker, 'BAT-A', { price: BAT_A_PRICE });

  await dai.approveUnlimited();

  ethCdp = await mgr.openLockAndDraw(
    'ETH-A',
    ETH_A_COLLATERAL_AMOUNT,
    ETH_A_DEBT_AMOUNT
  );
  batCdp = await mgr.openLockAndDraw(
    'BAT-A',
    BAT_A_COLLATERAL_AMOUNT,
    BAT_A_DEBT_AMOUNT
  );
}, 10000);

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(USER_VAULT_IDS, async () => {
  const userVaultIds = await maker.latest(
    USER_VAULT_IDS,
    CDP_MANAGER,
    proxyAddress
  );

  expect(userVaultIds[0]).toEqual(2);
  expect(userVaultIds[1]).toEqual(1);
});

test(USER_VAULT_ADDRESSES, async () => {
  const userVaultAddresses = await maker.latest(
    USER_VAULT_ADDRESSES,
    CDP_MANAGER,
    proxyAddress
  );

  expect(userVaultAddresses[0]).toEqual(await mgr.getUrn(batCdp.id));
  expect(userVaultAddresses[1]).toEqual(await mgr.getUrn(ethCdp.id));
});

test(USER_VAULT_TYPES, async () => {
  const userVaultTypes = await maker.latest(
    USER_VAULT_TYPES,
    CDP_MANAGER,
    proxyAddress
  );

  expect(userVaultTypes[0]).toEqual('BAT-A');
  expect(userVaultTypes[1]).toEqual('ETH-A');
});
