/* eslint-disable */
import { mcdMaker, setupCollateral } from '../helpers';
import { ETH, BAT, MDAI, USD } from '../../src';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import {
  toHex,
  fromRad,
  fromWei,
  fromRay,
  isBigNumber,
  isCurrency,
  isValidAddressString
} from '../../src/utils';
import { ServiceRoles } from '../../src/constants';
import BigNumber from 'bignumber.js';

import schemas, {
  TOTAL_ENCUMBERED_DEBT,
  DEBT_SCALING_FACTOR,
  PRICE_WITH_SAFETY_MARGIN,
  DEBT_CEILING,
  URN_DEBT_FLOOR,
  TOTAL_DAI_SUPPLY,
  PRICE_FEED_ADDRESS,
  RAW_LIQUIDATION_RATIO,
  RATIO_DAI_USD,
  LIQUIDATION_RATIO,
  ILK_PRICE,
  ILK_PRICES,
  UNLOCKED_COLLATERAL,
  ENCUMBERED_COLLATERAL,
  ENCUMBERED_DEBT,
  PROXY_ADDRESS,
  VAULT_URN,
  VAULT_ILK,
  VAULT_ILK_AND_URN,
  VAULT_BY_ID,
  DATE_STABILITY_FEES_LAST_LEVIED,
  ANNUAL_STABILITY_FEE,
  TOTAL_SAVINGS_DAI,
  SAVINGS_DAI_BY_PROXY,
  SAVINGS_DAI,
  DAI_SAVINGS_RATE,
  ANNUAL_DAI_SAVINGS_RATE,
  DATE_EARNINGS_LAST_ACCRUED,
  LIQUIDATOR_ADDRESS,
  LIQUIDATION_PENALTY,
  MAX_AUCTION_LOT_SIZE
} from '../../src/schemas';

let mcall,
  maker,
  address,
  watcher,
  snapshotData,
  cdpMgr,
  cdpTypeService,
  proxyService,
  ethAInfo,
  batAInfo,
  vault;

const ETH_A_COLLATERAL_AMOUNT = ETH(1);
const ETH_A_DEBT_AMOUNT = MDAI(1);
const ETH_A_PRICE = 180;

const BAT_A_COLLATERAL_AMOUNT = BAT(1);
const BAT_A_DEBT_AMOUNT = MDAI(1);
const BAT_A_PRICE = 40;

const setupFn = async () => {
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
};

beforeAll(async () => {
  snapshotData = await takeSnapshot(maker);
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

  address = maker.service('web3').currentAddress();
  cdpMgr = maker.service(ServiceRoles.CDP_MANAGER);
  cdpTypeService = maker.service(ServiceRoles.CDP_TYPE);
  proxyService = maker.service('proxy');
  vault = await setupFn();

  ethAInfo = await cdpTypeService.getCdpType(ETH, 'ETH-A').ilkInfo();
  batAInfo = await cdpTypeService.getCdpType(BAT, 'BAT-A').ilkInfo();
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(ILK_PRICE, async () => {
  const ethAPrice = await maker.latest(ILK_PRICE, 'ETH-A');
  expect(ethAPrice.toNumber()).toEqual(180);
  expect(ethAPrice.symbol).toEqual('USD/ETH');
});

test(ILK_PRICES, async () => {
  const [ethAPrice, ethBPrice, batAPrice] = await maker.latest(ILK_PRICES, [
    'ETH-A',
    'ETH-B',
    'BAT-A'
  ]);

  expect(ethAPrice.toNumber()).toEqual(180);
  expect(ethBPrice.toNumber()).toEqual(150);
  expect(batAPrice.toNumber()).toEqual(40);

  expect(ethAPrice.symbol).toEqual('USD/ETH');
  expect(ethBPrice.symbol).toEqual('USD/ETH');
  expect(batAPrice.symbol).toEqual('USD/BAT');
});

test(VAULT_ILK_AND_URN, async () => {
  const cdpId = 1;
  const expectedIlk = 'ETH-A';
  const expectedUrn = '0x6D43e8f5A6D2b5aD2b242A1D3CF957C71AfC48a1';
  const [ilk, urn] = await maker.latest(VAULT_ILK_AND_URN, cdpId);
  expect(ilk).toEqual(expectedIlk);
  expect(urn).toEqual(expectedUrn);
});

test(VAULT_BY_ID, async () => {
  const cdpId = 1;
  const expectedIlk = 'ETH-A';
  const expectedUrn = '0x6D43e8f5A6D2b5aD2b242A1D3CF957C71AfC48a1';
  const expectedInk = fromWei(1000000000000000000);
  const expectedArt = fromWei(995000000000000000);
  const { ilk, urn, encumberedCollateral, encumberedDebt } = await maker.latest(
    VAULT_BY_ID,
    cdpId
  );

  expect(ilk).toEqual(expectedIlk);
  expect(urn).toEqual(expectedUrn);
  expect(encumberedCollateral).toEqual(expectedInk);
  expect(encumberedDebt.toNumber()).toBeCloseTo(expectedArt.toNumber());
});

test(
  SAVINGS_DAI,
  async () => {
    const savingsDai = await maker.latest(SAVINGS_DAI, address);
    expect(savingsDai.symbol).toEqual('CHAI');
    expect(savingsDai.toNumber()).toBeCloseTo(0.99995);
  },
  10000
);

test(ANNUAL_STABILITY_FEE, async () => {
  const expected = 0.04999999999989363;
  const annualStabilityFee = await maker.latest(ANNUAL_STABILITY_FEE, 'ETH-A');
  expect(annualStabilityFee).toEqual(expected);
});

test(DATE_STABILITY_FEES_LAST_LEVIED, async () => {
  var timestamp = Math.round(new Date().getTime() / 1000);
  const dateStabilityFeesLastLevied = await maker.latest(
    DATE_STABILITY_FEES_LAST_LEVIED,
    'ETH-A'
  );

  expect(dateStabilityFeesLastLevied instanceof Date).toEqual(true);
  expect(timestamp - dateStabilityFeesLastLevied).toBeLessThanOrEqual(10);
});

test(LIQUIDATOR_ADDRESS, async () => {
  const expected = '0x55320248dC50Ef6dABc88ECbc294Fd5e2e1f4eC6';
  const address = await maker.latest(LIQUIDATOR_ADDRESS, 'ETH-A');
  expect(address).toEqual(expected);
});

test(LIQUIDATION_PENALTY, async () => {
  const expected = 0.05;
  const liquidationPenalty = await maker.latest(LIQUIDATION_PENALTY, 'ETH-A');
  expect(liquidationPenalty).toEqual(expected);
});

test(MAX_AUCTION_LOT_SIZE, async () => {
  const expected = BigNumber('1.5');
  const maxLotSize = await maker.latest(MAX_AUCTION_LOT_SIZE, 'ETH-A');
  expect(maxLotSize).toEqual(expected);
});
