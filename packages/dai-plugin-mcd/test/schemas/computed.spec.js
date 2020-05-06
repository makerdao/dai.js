import { mcdMaker, setupCollateral } from '../helpers';
import { ETH, BAT, MDAI, USD } from '../../src';
import {
  takeSnapshot,
  restoreSnapshot,
  TestAccountProvider,
  mineBlocks
} from '@makerdao/test-helpers';
import { fromWei, isValidAddressString } from '../../src/utils';
import { ServiceRoles } from '../../src/constants';
import BigNumber from 'bignumber.js';

import {
  COLLATERAL_TYPE_PRICE,
  COLLATERAL_TYPES_PRICES,
  DEFAULT_COLLATERAL_TYPES_PRICES,
  VAULT_TYPE_AND_ADDRESS,
  VAULT_EXTERNAL_OWNER,
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
  BALANCE,
  ALLOWANCE,
  USER_VAULTS_LIST,
  PROXY_OWNER,
  COLLATERAL_TYPE_DATA,
  COLLATERAL_TYPES_DATA
} from '../../src/schemas';

import { vatIlks, vatUrns, vatGem } from '../../src/schemas/vat';
import {
  cdpManagerUrns,
  cdpManagerIlks,
  cdpManagerOwner
} from '../../src/schemas/cdpManager';
import { spotIlks, spotPar } from '../../src/schemas/spot';
import { proxyRegistryProxies } from '../../src/schemas/proxyRegistry';
import { potPie, potpie, potChi } from '../../src/schemas/pot';
import { catIlks } from '../../src/schemas/cat';
import { jugIlks } from '../../src/schemas/jug';
import {
  tokenBalance,
  tokenAllowance,
  tokenAllowanceBase
} from '../../src/schemas/token';
import { getCdps } from '../../src/schemas/getCdps';
import computedSchemas from '../../src/schemas/computed';

import { createCurrencyRatio } from '@makerdao/currency';

let maker,
  multicall,
  snapshotData,
  address,
  address2,
  proxyAddress,
  expectedEthVaultAddress,
  expectedBatVaultAddress;
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
  address = maker.service('web3').currentAddress();
  address2 = TestAccountProvider.nextAccount().address;
  multicall = maker.service('multicall');
  multicall.createWatcher();
  multicall.registerSchemas({
    vatIlks,
    vatUrns,
    vatGem,
    cdpManagerUrns,
    cdpManagerIlks,
    cdpManagerOwner,
    spotPar,
    spotIlks,
    proxyRegistryProxies,
    potPie,
    potpie,
    potChi,
    tokenBalance,
    catIlks,
    jugIlks,
    tokenAllowance,
    tokenAllowanceBase,
    getCdps,
    ...computedSchemas
  });
  multicall.start();

  await setupCollateral(maker, 'ETH-A', {
    price: ETH_A_PRICE
  });
  await setupCollateral(maker, 'BAT-A', { price: BAT_A_PRICE });

  const mgr = await maker.service(ServiceRoles.CDP_MANAGER);
  const sav = await maker.service(ServiceRoles.SAVINGS);
  const dai = maker.getToken(MDAI);
  proxyAddress = await maker.service('proxy').ensureProxy();
  await dai.approveUnlimited(proxyAddress);

  let vault = await mgr.openLockAndDraw(
    'ETH-A',
    ETH_A_COLLATERAL_AMOUNT,
    ETH_A_DEBT_AMOUNT
  );
  expectedEthVaultAddress = await mgr.getUrn(vault.id);

  vault = await mgr.openLockAndDraw(
    'BAT-A',
    BAT_A_COLLATERAL_AMOUNT,
    BAT_A_DEBT_AMOUNT
  );
  expectedBatVaultAddress = await mgr.getUrn(vault.id);

  await sav.join(MDAI(1));
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(DAI_LOCKED_IN_DSR, async () => {
  const daiLockedInDsr = await maker.latest(DAI_LOCKED_IN_DSR, address);
  expect(daiLockedInDsr.symbol).toEqual('DSR-DAI');
  expect(daiLockedInDsr.toNumber()).toBeCloseTo(1, 18);
});

test(`${DAI_LOCKED_IN_DSR} using invalid account address`, async () => {
  const promise = maker.latest(DAI_LOCKED_IN_DSR, '0xfoobar');
  await expect(promise).rejects.toThrow(/invalid/i);
});

test(`${DAI_LOCKED_IN_DSR} before and after account has proxy`, async () => {
  const nextAccount = TestAccountProvider.nextAccount();
  await maker.addAccount({ ...nextAccount, type: 'privateKey' });
  maker.useAccount(nextAccount.address);

  const promise = maker.latest(DAI_LOCKED_IN_DSR, nextAccount.address);
  await expect(promise).rejects.toThrow(/invalid/i);

  await maker.service('proxy').ensureProxy();
  await mineBlocks(maker.service('token'), 1);

  const daiLockedInDsr = await maker.latest(
    DAI_LOCKED_IN_DSR,
    nextAccount.address
  );
  expect(daiLockedInDsr.symbol).toEqual('DSR-DAI');
  expect(daiLockedInDsr.toNumber()).toEqual(0);
});

test(TOTAL_DAI_LOCKED_IN_DSR, async () => {
  const totalDaiLockedInDsr = await maker.latest(TOTAL_DAI_LOCKED_IN_DSR);
  expect(totalDaiLockedInDsr.symbol).toEqual('DSR-DAI');
  expect(totalDaiLockedInDsr.toNumber()).toBeCloseTo(1, 18);
});

test(COLLATERAL_TYPE_PRICE, async () => {
  const ethAPrice = await maker.latest(COLLATERAL_TYPE_PRICE, 'ETH-A');
  expect(ethAPrice.toNumber()).toEqual(180);
  expect(ethAPrice.symbol).toEqual('USD/ETH');
});

test(COLLATERAL_TYPES_PRICES, async () => {
  const [ethAPrice, batAPrice] = await maker.latest(COLLATERAL_TYPES_PRICES, [
    'ETH-A',
    'BAT-A'
  ]);

  expect(ethAPrice.toNumber()).toEqual(180);
  expect(batAPrice.toNumber()).toEqual(40);

  expect(ethAPrice.symbol).toEqual('USD/ETH');
  expect(batAPrice.symbol).toEqual('USD/BAT');
});

test.skip(DEFAULT_COLLATERAL_TYPES_PRICES, async () => {
  const [ethAPrice, batAPrice] = await maker.latest(
    DEFAULT_COLLATERAL_TYPES_PRICES
  );

  expect(ethAPrice.toNumber()).toEqual(180);
  expect(batAPrice.toNumber()).toEqual(40);

  expect(ethAPrice.symbol).toEqual('USD/ETH');
  expect(batAPrice.symbol).toEqual('USD/BAT');
});

test(VAULT_TYPE_AND_ADDRESS, async () => {
  const cdpId = 1;
  const expectedVaultType = 'ETH-A';
  const [collateralType, vaultAddress] = await maker.latest(
    VAULT_TYPE_AND_ADDRESS,
    cdpId
  );
  expect(collateralType).toEqual(expectedVaultType);
  expect(vaultAddress).toEqual(expectedEthVaultAddress);
});

test(VAULT_EXTERNAL_OWNER, async () => {
  const cdpId = 1;
  const owner = await maker.latest(VAULT_EXTERNAL_OWNER, cdpId);
  expect(owner.toLowerCase()).toEqual(address);
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
  const expectedOwner = proxyAddress;
  const expectedExternalOwner = address;
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
  const expectedLiqRatio = createCurrencyRatio(USD, MDAI)(1.5);
  const expectedLiqPenalty = BigNumber('0.05');
  const expectedAnnStabilityFee = 0.04999999999989363;
  const expectedDebtFloor = BigNumber('0');

  const vault = await maker.latest(VAULT, cdpId);

  expect(Object.keys(vault).length).toBe(24);

  expect(vault.id).toEqual(cdpId);
  expect(vault.vaultType).toEqual(expectedVaultType);
  expect(vault.vaultAddress).toEqual(expectedEthVaultAddress);
  expect(vault.ownerAddress).toEqual(expectedOwner);
  expect(vault.externalOwnerAddress.toLowerCase()).toEqual(
    expectedExternalOwner
  );
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
  expect(vault.liquidationRatio.toString()).toEqual(
    expectedLiqRatio.toString()
  );
  expect(vault.liquidationPenalty).toEqual(expectedLiqPenalty);
  expect(vault.annualStabilityFee.toNumber()).toEqual(expectedAnnStabilityFee);
  expect(vault.debtFloor).toEqual(expectedDebtFloor);
});

test(`${VAULT} with non-existent id`, async () => {
  const cdpId = 9000;
  const vault = maker.latest(VAULT, cdpId);
  await expect(vault).rejects.toThrow(/not exist/i);
});

test(`${VAULT} with invalid id`, async () => {
  const cdpId = -9000;
  const vault = maker.latest(VAULT, cdpId);
  await expect(vault).rejects.toThrow(/invalid vault id/i);
});

test(BALANCE, async () => {
  expect.assertions(11);

  const ethBalance = await maker.latest(BALANCE, 'ETH', address2);
  const batBalance = await maker.latest(BALANCE, 'BAT', address);

  expect(ethBalance.symbol).toEqual('ETH');
  expect(batBalance.symbol).toEqual('BAT');
  expect(ethBalance.toBigNumber()).toEqual(BigNumber('100'));
  expect(batBalance.toBigNumber()).toEqual(BigNumber('999'));

  const daiBalance = await maker.latest(BALANCE, 'DAI', address);
  const wethBalance = await maker.latest(BALANCE, 'WETH', address);

  expect(daiBalance.symbol).toEqual('MDAI');
  expect(daiBalance.toBigNumber()).toEqual(BigNumber('1'));

  expect(wethBalance.symbol).toEqual('MWETH');
  expect(wethBalance.toBigNumber()).toEqual(BigNumber('0'));

  const dsrDaiBalance = await maker.latest(BALANCE, 'DSR-DAI', address);
  expect(dsrDaiBalance.symbol).toEqual('DSR-DAI');
  expect(dsrDaiBalance.toNumber()).toBeCloseTo(1, 18);

  try {
    await maker.latest(BALANCE, 'NON_MCD_TOKEN', address);
  } catch (e) {
    expect(e).toEqual(
      Error('NON_MCD_TOKEN token is not part of the default tokens list')
    );
  }
});

test(ALLOWANCE, async () => {
  const nextAccount = TestAccountProvider.nextAccount();
  await maker.addAccount({ ...nextAccount, type: 'privateKey' });
  maker.useAccount(nextAccount.address);
  const nextAccountProxy = await maker.service('proxy').ensureProxy();

  const ethAllowance = await maker.latest(
    ALLOWANCE,
    'ETH',
    nextAccount.address
  );
  expect(ethAllowance).toEqual(true);

  let batAllowance;
  batAllowance = await maker.latest(ALLOWANCE, 'BAT', nextAccount.address);
  expect(batAllowance).toEqual(false);

  await maker
    .service('token')
    .getToken('BAT')
    .approveUnlimited(nextAccountProxy);
  await mineBlocks(maker.service('token'), 1);

  batAllowance = await maker.latest(ALLOWANCE, 'BAT', nextAccount.address);
  expect(batAllowance).toEqual(true);

  maker.useAccount('default');
});

test(`${ALLOWANCE} using invalid account address`, async () => {
  const promise = maker.latest(ALLOWANCE, 'BAT', null);
  await expect(promise).rejects.toThrow(/invalid address/i);
});

test(`${ALLOWANCE} for account with no proxy`, async () => {
  const promise = maker.latest(ALLOWANCE, 'BAT', address2);
  await expect(promise).rejects.toThrow(/invalid proxy/i);
});

test(USER_VAULTS_LIST, async () => {
  const [batVault, ethVault] = await maker.latest(USER_VAULTS_LIST, address);

  expect(batVault.vaultId).toEqual(2);
  expect(ethVault.vaultId).toEqual(1);

  expect(batVault.vaultType).toEqual('BAT-A');
  expect(ethVault.vaultType).toEqual('ETH-A');

  expect(batVault.vaultAddress).toEqual(expectedBatVaultAddress);
  expect(ethVault.vaultAddress).toEqual(expectedEthVaultAddress);
});

test(`${USER_VAULTS_LIST} for account with no proxy`, async () => {
  const promise = maker.latest(USER_VAULTS_LIST, address2);
  await expect(promise).rejects.toThrow(/invalid/i);
});

test(`${USER_VAULTS_LIST} for account with no proxy`, async () => {
  const promise = maker.latest(USER_VAULTS_LIST, address2);
  await expect(promise).rejects.toThrow(/invalid/i);
});

test(PROXY_OWNER, async () => {
  const proxyOwner = await maker.latest(PROXY_OWNER, proxyAddress);
  expect(isValidAddressString(proxyOwner)).toEqual(true);
  expect(proxyOwner.toLowerCase()).toEqual(address);
});

test(COLLATERAL_TYPE_DATA, async () => {
  const collateralType = 'ETH-A';
  const expectedColTypePrice = createCurrencyRatio(USD, ETH)(180);
  const expectedLiqRatio = createCurrencyRatio(USD, MDAI)(1.5);
  const expectedLiqPenalty = BigNumber('0.05');
  const expectedAnnStabilityFee = 0.04999999999989363;
  const expectedPriceWithSafetyMargin = BigNumber('120');
  const expectedDebtFloor = BigNumber('0');

  const colData = await maker.latest(COLLATERAL_TYPE_DATA, collateralType);

  expect(Object.keys(colData).length).toBe(10);

  expect(colData.symbol).toEqual(collateralType);
  expect(colData.collateralTypePrice.toString()).toEqual(
    expectedColTypePrice.toString()
  );
  expect(colData.liquidationRatio.toString()).toEqual(
    expectedLiqRatio.toString()
  );
  expect(colData.liquidationPenalty).toEqual(expectedLiqPenalty);
  expect(colData.annualStabilityFee.toNumber()).toEqual(
    expectedAnnStabilityFee
  );
  expect(colData.priceWithSafetyMargin).toEqual(expectedPriceWithSafetyMargin);
  expect(colData.debtFloor).toEqual(expectedDebtFloor);
});

test(COLLATERAL_TYPES_DATA, async () => {
  const [ethAData, batAData] = await maker.latest(COLLATERAL_TYPES_DATA, [
    'ETH-A',
    'BAT-A'
  ]);

  const expectedEth = await maker.latest(COLLATERAL_TYPE_DATA, 'ETH-A');
  const expectedBat = await maker.latest(COLLATERAL_TYPE_DATA, 'BAT-A');

  expect(Object.entries(ethAData).length).toBe(10);
  expect(Object.entries(batAData).length).toBe(10);

  expect(JSON.stringify(ethAData)).toEqual(JSON.stringify(expectedEth));
  expect(JSON.stringify(batAData)).toEqual(JSON.stringify(expectedBat));
});
