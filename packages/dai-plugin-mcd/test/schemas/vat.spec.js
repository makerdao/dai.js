import { mcdMaker, setupCollateral } from '../helpers';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { ETH, BAT, MDAI } from '../../src';
import { ServiceRoles } from '../../src/constants';
import { fromRay, fromWei, isBigNumber, isCurrency } from '../../src/utils';
import BigNumber from 'bignumber.js';

import {
  TOTAL_ENCUMBERED_DEBT,
  DEBT_SCALING_FACTOR,
  PRICE_WITH_SAFETY_MARGIN,
  DEBT_CEILING,
  DEBT_FLOOR,
  TOTAL_DAI_SUPPLY,
  ENCUMBERED_COLLATERAL,
  ENCUMBERED_DEBT,
  UNLOCKED_COLLATERAL,
  GLOBAL_DEBT_CEILING
} from '../../src/schemas';

import vatSchemas from '../../src/schemas/vat';

let maker, snapshotData, ethAInfo, batAInfo, cdpMgr, cdpTypeService;

const ETH_A_COLLATERAL_AMOUNT = ETH(1);
const ETH_A_DEBT_AMOUNT = MDAI(1);
const ETH_A_PRICE = 180;

const BAT_A_COLLATERAL_AMOUNT = BAT(1);
const BAT_A_DEBT_AMOUNT = MDAI(1);
const BAT_A_PRICE = 40;

beforeAll(async () => {
  maker = await mcdMaker({
    cdpTypes: [
      { currency: ETH, ilk: 'ETH-A' },
      { currency: BAT, ilk: 'BAT-A' }
    ],
    multicall: true
  });

  snapshotData = await takeSnapshot(maker);
  maker.service('multicall').createWatcher();
  maker.service('multicall').registerSchemas(vatSchemas);
  maker.service('multicall').start();
  await setupCollateral(maker, 'ETH-A', {
    price: ETH_A_PRICE
  });
  await setupCollateral(maker, 'BAT-A', { price: BAT_A_PRICE });

  cdpMgr = await maker.service(ServiceRoles.CDP_MANAGER);
  const dai = maker.getToken(MDAI);
  const _proxyAddress = await maker.service('proxy').ensureProxy();
  await dai.approveUnlimited(_proxyAddress);

  await cdpMgr.openLockAndDraw(
    'ETH-A',
    ETH_A_COLLATERAL_AMOUNT,
    ETH_A_DEBT_AMOUNT
  );
  await cdpMgr.openLockAndDraw(
    'BAT-A',
    BAT_A_COLLATERAL_AMOUNT,
    BAT_A_DEBT_AMOUNT
  );
  cdpTypeService = maker.service(ServiceRoles.CDP_TYPE);
  ethAInfo = await cdpTypeService.getCdpType(ETH, 'ETH-A').ilkInfo();
  batAInfo = await cdpTypeService.getCdpType(BAT, 'BAT-A').ilkInfo();
}, 10000);

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test(TOTAL_ENCUMBERED_DEBT, async () => {
  // TODO Define hardcoded rates for given ilks outside of the system and test
  // against those rather than data extracted from the chain
  const { rate: ethARate } = ethAInfo;
  const { rate: batARate } = batAInfo;

  const ethADebtAmount = ETH_A_DEBT_AMOUNT.toBigNumber();
  const batADebtAmount = BAT_A_DEBT_AMOUNT.toBigNumber();

  const ethAEncumberedDebt = await maker.latest(TOTAL_ENCUMBERED_DEBT, 'ETH-A');
  const batAEncumberedDebt = await maker.latest(TOTAL_ENCUMBERED_DEBT, 'BAT-A');

  expect(isBigNumber(ethAEncumberedDebt)).toEqual(true);
  expect(isBigNumber(batAEncumberedDebt)).toEqual(true);

  expect(ethAEncumberedDebt.toNumber()).toBeCloseTo(
    ethADebtAmount.div(fromRay(ethARate)).toNumber(),
    12
  );

  expect(batAEncumberedDebt.toNumber()).toBeCloseTo(
    batADebtAmount.div(fromRay(batARate)).toNumber(),
    12
  );
});

test(DEBT_SCALING_FACTOR, async () => {
  const { rate: ethARate } = ethAInfo;
  const { rate: batARate } = batAInfo;

  const ethADebtScalingFactor = await maker.latest(
    DEBT_SCALING_FACTOR,
    'ETH-A'
  );
  const batADebtScalingFactor = await maker.latest(
    DEBT_SCALING_FACTOR,
    'BAT-A'
  );

  expect(isBigNumber(ethADebtScalingFactor)).toEqual(true);
  expect(isBigNumber(batADebtScalingFactor)).toEqual(true);

  expect(ethADebtScalingFactor).toEqual(fromRay(ethARate));
  expect(batADebtScalingFactor).toEqual(fromRay(batARate));
});

test(PRICE_WITH_SAFETY_MARGIN, async () => {
  const ethAPriceWithSafetyMargin = await maker.latest(
    PRICE_WITH_SAFETY_MARGIN,
    'ETH-A'
  );
  const batAPriceWithSafetyMargin = await maker.latest(
    PRICE_WITH_SAFETY_MARGIN,
    'BAT-A'
  );

  const ethACalculatedMargin = BigNumber(ETH_A_PRICE)
    .times(2)
    .div(3);
  const batACalculatedMargin = BigNumber(BAT_A_PRICE).div(2);

  expect(isBigNumber(ethAPriceWithSafetyMargin)).toEqual(true);
  expect(isBigNumber(batAPriceWithSafetyMargin)).toEqual(true);

  expect(ethAPriceWithSafetyMargin).toEqual(ethACalculatedMargin);
  expect(batAPriceWithSafetyMargin).toEqual(batACalculatedMargin);
});

test(DEBT_CEILING, async () => {
  const ethADebtCeiling = await maker.latest(DEBT_CEILING, 'ETH-A');
  const batADebtCeiling = await maker.latest(DEBT_CEILING, 'BAT-A');

  expect(isCurrency(ethADebtCeiling)).toEqual(true);
  expect(isCurrency(batADebtCeiling)).toEqual(true);

  expect(ethADebtCeiling.isEqual(MDAI(100000))).toEqual(true);
  expect(batADebtCeiling.isEqual(MDAI(5000))).toEqual(true);
});

test(DEBT_FLOOR, async () => {
  const ethADebtFloor = await maker.latest(DEBT_FLOOR, 'ETH-A');
  const batADebtFloor = await maker.latest(DEBT_FLOOR, 'BAT-A');

  expect(isBigNumber(ethADebtFloor)).toEqual(true);
  expect(isBigNumber(batADebtFloor)).toEqual(true);

  expect(ethADebtFloor).toEqual(BigNumber('0'));
  expect(batADebtFloor).toEqual(BigNumber('0'));
});

test(TOTAL_DAI_SUPPLY, async () => {
  const { Art: ethAArt, rate: ethARate } = ethAInfo;
  const { Art: batAArt, rate: batARate } = batAInfo;

  const ethADaiGenerated = MDAI.rad(BigNumber(ethAArt).times(ethARate));
  const batADaiGenerated = MDAI.rad(BigNumber(batAArt).times(batARate));
  const sumOfDaiGeneratedFromIlks = ethADaiGenerated.plus(batADaiGenerated);

  const totalDaiAmount = await maker.latest(TOTAL_DAI_SUPPLY);

  expect(totalDaiAmount.symbol).toEqual('MDAI');
  expect(totalDaiAmount.isEqual(sumOfDaiGeneratedFromIlks)).toEqual(true);
});

test(ENCUMBERED_COLLATERAL, async () => {
  const cdpId = 1;
  const expected = fromWei(1000000000000000000);
  const encumberedCollateral = await maker.latest(
    ENCUMBERED_COLLATERAL,
    'ETH-A',
    await cdpMgr.getUrn(cdpId)
  );
  expect(encumberedCollateral).toEqual(expected);
});

test(ENCUMBERED_DEBT, async () => {
  const cdpId = 1;
  const expected = fromWei(995000000000000000);
  const encumberedDebt = await maker.latest(
    ENCUMBERED_DEBT,
    'ETH-A',
    await cdpMgr.getUrn(cdpId)
  );
  expect(encumberedDebt.toNumber()).toBeCloseTo(expected.toNumber());
});

test(UNLOCKED_COLLATERAL, async () => {
  const cdpId = 1;
  const expected = 0;
  const col = await maker.latest(
    UNLOCKED_COLLATERAL,
    'ETH-A',
    await cdpMgr.getUrn(cdpId)
  );

  expect(col).toEqual(fromWei(expected));
});

test(GLOBAL_DEBT_CEILING, async () => {
  const globalDebtCeiling = await maker.latest(GLOBAL_DEBT_CEILING);

  expect(globalDebtCeiling.symbol).toEqual(MDAI.symbol);
  expect(globalDebtCeiling.toBigNumber()).toEqual(BigNumber('1000000'));
});
