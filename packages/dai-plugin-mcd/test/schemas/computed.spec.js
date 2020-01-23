import { mcdMaker, setupCollateral } from '../helpers';
import { ETH, BAT, MDAI, USD } from '../../src';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { fromWei } from '../../src/utils';
import { ServiceRoles } from '../../src/constants';
import BigNumber from 'bignumber.js';

import {
  COLLATERAL_TYPE_PRICE,
  COLLATERAL_TYPES_PRICES,
  VAULT_TYPE_AND_ADDRESS,
  VAULT,
  DEBT_VALUE,
  COLLATERALIZATION_RATIO,
  COLLATERAL_AMOUNT,
  COLLATERAL_VALUE,
  LIQUIDATION_PRICE,
  DAI_AVAILABLE,
  MIN_SAFE_COLLATERAL_AMOUNT,
  COLLATERAL_AVAILABLE_AMOUNT,
  COLLATERAL_AVAILABLE_VALUE,
  DAI_LOCKED_IN_DSR,
  TOTAL_DAI_LOCKED_IN_DSR,
  BALANCE
} from '../../src/schemas';

import { vatIlks, vatUrns, vatGem } from '../../src/schemas/vat';
import { cdpManagerUrns, cdpManagerIlks } from '../../src/schemas/cdpManager';
import { spotIlks, liquidationRatio, spotPar } from '../../src/schemas/spot';
import { proxyRegistryProxies } from '../../src/schemas/proxyRegistry';
import { potPie, potpie, potChi } from '../../src/schemas/pot';
import { tokenBalance } from '../../src/schemas/token';
import computedSchemas from '../../src/schemas/computed';
import { createCurrencyRatio } from '@makerdao/currency';

let maker, snapshotData;

const ETH_A_COLLATERAL_AMOUNT = ETH(1);
const ETH_A_DEBT_AMOUNT = MDAI(1);
const ETH_A_PRICE = 180;

const BAT_A_COLLATERAL_AMOUNT = BAT(1);
const BAT_A_DEBT_AMOUNT = MDAI(1);
const BAT_A_PRICE = 40;

beforeAll(async () => {
  snapshotData = await takeSnapshot(maker);
  maker = await mcdMaker({
    cdpTypes: [
      { currency: ETH, ilk: 'ETH-A' },
      { currency: BAT, ilk: 'BAT-A' }
    ],
    multicall: true
  });

  maker.service('multicall').createWatcher({ interval: 'block' });
  maker.service('multicall').registerSchemas({
    vatIlks,
    vatUrns,
    vatGem,
    cdpManagerUrns,
    cdpManagerIlks,
    spotPar,
    spotIlks,
    proxyRegistryProxies,
    potPie,
    potpie,
    potChi,
    liquidationRatio,
    tokenBalance,
    ...computedSchemas
  });
  maker.service('multicall').start();

  await setupCollateral(maker, 'ETH-A', {
    price: ETH_A_PRICE
  });
  await setupCollateral(maker, 'BAT-A', { price: BAT_A_PRICE });

  const mgr = await maker.service(ServiceRoles.CDP_MANAGER);
  const sav = await maker.service(ServiceRoles.SAVINGS);
  const dai = maker.getToken(MDAI);
  const _proxyAddress = await maker.service('proxy').ensureProxy();
  await dai.approveUnlimited(_proxyAddress);

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

  await sav.join(MDAI(1));
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(COLLATERAL_TYPE_PRICE, async () => {
  const ethAPrice = await maker.latest(COLLATERAL_TYPE_PRICE, 'ETH-A');
  expect(ethAPrice.toNumber()).toEqual(180);
  expect(ethAPrice.symbol).toEqual('USD/ETH');
});

test(COLLATERAL_TYPES_PRICES, async () => {
  const [ethAPrice, batAPrice] = await maker.latest(COLLATERAL_TYPES_PRICES);

  expect(ethAPrice.toNumber()).toEqual(180);
  expect(batAPrice.toNumber()).toEqual(40);

  expect(ethAPrice.symbol).toEqual('USD/ETH');
  expect(batAPrice.symbol).toEqual('USD/BAT');
});

test(VAULT_TYPE_AND_ADDRESS, async () => {
  const cdpId = 1;
  const expectedVaultType = 'ETH-A';
  const expectedVaultAddress = '0x6D43e8f5A6D2b5aD2b242A1D3CF957C71AfC48a1';
  const [collateralType, vaultAddress] = await maker.latest(
    VAULT_TYPE_AND_ADDRESS,
    cdpId
  );
  expect(collateralType).toEqual(expectedVaultType);
  expect(vaultAddress).toEqual(expectedVaultAddress);
});

test(COLLATERAL_AMOUNT, async () => {
  const cdpId = 1;
  const collateralAmount = await maker.latest(COLLATERAL_AMOUNT, cdpId);
  const expected = ETH(1);

  expect(collateralAmount.toString()).toEqual(expected.toString());
});

test(COLLATERAL_VALUE, async () => {
  const cdpId = 1;
  const collateralValue = await maker.latest(COLLATERAL_VALUE, cdpId);
  const expected = USD(180);

  expect(collateralValue.toString()).toEqual(expected.toString());
});

test(COLLATERALIZATION_RATIO, async () => {
  const cdpId = 1;
  const colRatio = await maker.latest(COLLATERALIZATION_RATIO, cdpId);
  const expected = createCurrencyRatio(USD, MDAI)(180);

  expect(colRatio.toString()).toEqual(expected.toString());
});

test(DEBT_VALUE, async () => {
  const cdpId = 1;
  const debtValue = await maker.latest(DEBT_VALUE, cdpId);
  const expected = MDAI(1);

  expect(debtValue.toNumber()).toEqual(expected.toNumber());
});

test(LIQUIDATION_PRICE, async () => {
  const cdpId = 1;
  const liqPrice = await maker.latest(LIQUIDATION_PRICE, cdpId);
  const expected = createCurrencyRatio(USD, ETH)(1.5);

  expect(liqPrice.toString()).toEqual(expected.toString());
});

test(DAI_AVAILABLE, async () => {
  const cdpId = 1;
  const daiAvailable = await maker.latest(DAI_AVAILABLE, cdpId);
  const expected = MDAI(119);

  expect(daiAvailable.toString()).toEqual(expected.toString());
});

test(MIN_SAFE_COLLATERAL_AMOUNT, async () => {
  const cdpId = 1;
  const minSafe = await maker.latest(MIN_SAFE_COLLATERAL_AMOUNT, cdpId);
  const expected = ETH(0.01);

  expect(minSafe.toString()).toEqual(expected.toString());
});

test(COLLATERAL_AVAILABLE_AMOUNT, async () => {
  const cdpId = 1;
  const avail = await maker.latest(COLLATERAL_AVAILABLE_AMOUNT, cdpId);
  const expected = ETH(0.99);

  expect(avail.toString()).toEqual(expected.toString());
});

test(COLLATERAL_AVAILABLE_VALUE, async () => {
  const cdpId = 1;
  const value = await maker.latest(COLLATERAL_AVAILABLE_VALUE, cdpId);
  const expected = USD(178.5);

  expect(value.toString()).toEqual(expected.toString());
});

test(VAULT, async () => {
  const cdpId = 1;
  const expectedVaultType = 'ETH-A';
  const expectedVaultAddress = '0x6D43e8f5A6D2b5aD2b242A1D3CF957C71AfC48a1';
  const expectedEncumberedCollateral = fromWei(1000000000000000000);
  const expectedEncumberedDebt = fromWei(995000000000000000);
  const expectedColTypePrice = createCurrencyRatio(USD, ETH)(180);
  const expectedDebtValue = MDAI(1);
  const expectedColRatio = createCurrencyRatio(USD, MDAI)(180);
  const expectedCollateralAmount = ETH(1);
  const expectedCollateralValue = USD(180);
  const expectedLiquidationPrice = createCurrencyRatio(USD, ETH)(1.5);
  const expectedDaiAvailable = MDAI(119);
  const expectedCollateralAvailableAmount = ETH(0.99);
  const expectedCollateralAvailableValue = USD(178.5);
  const expectedUnlockedCollateral = fromWei(0);

  const vault = await maker.latest(VAULT, cdpId);

  expect(Object.keys(vault).length).toBe(14);

  expect(vault.vaultType).toEqual(expectedVaultType);
  expect(vault.vaultAddress).toEqual(expectedVaultAddress);
  expect(vault.encumberedCollateral).toEqual(expectedEncumberedCollateral);
  expect(vault.encumberedDebt.toNumber()).toBeCloseTo(
    expectedEncumberedDebt.toNumber()
  );
  expect(vault.collateralTypePrice.toString()).toEqual(
    expectedColTypePrice.toString()
  );
  expect(vault.collateralAmount.toString()).toEqual(
    expectedCollateralAmount.toString()
  );
  expect(vault.collateralValue.toString()).toEqual(
    expectedCollateralValue.toString()
  );
  expect(vault.debtValue.toString()).toEqual(expectedDebtValue.toString());
  expect(vault.collateralizationRatio.toString()).toEqual(
    expectedColRatio.toString()
  );
  expect(vault.liquidationPrice.toString()).toEqual(
    expectedLiquidationPrice.toString()
  );
  expect(vault.daiAvailable.toString()).toEqual(
    expectedDaiAvailable.toString()
  );
  expect(vault.collateralAvailableAmount.toString()).toEqual(
    expectedCollateralAvailableAmount.toString()
  );
  expect(vault.collateralAvailableValue.toString()).toEqual(
    expectedCollateralAvailableValue.toString()
  );
  expect(vault.unlockedCollateral).toEqual(expectedUnlockedCollateral);
});

test(DAI_LOCKED_IN_DSR, async () => {
  const daiLockedInDsr = await maker.latest(DAI_LOCKED_IN_DSR);
  expect(daiLockedInDsr.symbol).toEqual('DSR-DAI');
  expect(daiLockedInDsr.toNumber()).toBeCloseTo(1, 18);
});

test(TOTAL_DAI_LOCKED_IN_DSR, async () => {
  const totalDaiLockedInDsr = await maker.latest(DAI_LOCKED_IN_DSR);
  expect(totalDaiLockedInDsr.symbol).toEqual('DSR-DAI');
  expect(totalDaiLockedInDsr.toNumber()).toBeCloseTo(1, 18);
});

test(BALANCE, async () => {
  expect.assertions(11);

  const ethBalance = await maker.latest(BALANCE, 'ETH');
  const batBalance = await maker.latest(BALANCE, 'BAT');

  expect(ethBalance.symbol).toEqual('ETH');
  expect(batBalance.symbol).toEqual('BAT');
  expect(ethBalance.toNumber()).toBeCloseTo(93.675, 2);
  expect(batBalance.toBigNumber()).toEqual(BigNumber('999'));

  const daiBalance = await maker.latest(BALANCE, 'DAI');
  const wethBalance = await maker.latest(BALANCE, 'WETH');

  expect(daiBalance.symbol).toEqual('MDAI');
  expect(daiBalance.toBigNumber()).toEqual(BigNumber('1'));

  expect(wethBalance.symbol).toEqual('MWETH');
  expect(wethBalance.toBigNumber()).toEqual(BigNumber('0'));

  const dsrDaiBalance = await maker.latest(BALANCE, 'DSR-DAI');
  expect(dsrDaiBalance.symbol).toEqual('DSR-DAI');
  expect(dsrDaiBalance.toNumber()).toBeCloseTo(1, 18);

  try {
    await maker.latest(BALANCE, 'NON_MCD_TOKEN');
  } catch (e) {
    expect(e).toEqual(
      Error('NON_MCD_TOKEN token is not part of the default tokens list')
    );
  }
});
