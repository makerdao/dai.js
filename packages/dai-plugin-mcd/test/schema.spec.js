import { mcdMaker, setupCollateral } from './helpers';
import { ETH, BAT, MDAI, USD } from '../src';
import {
  toHex,
  fromRad,
  fromRay,
  isBigNumber,
  isValidAddressString
} from '../src/utils';
import { ServiceRoles } from '../src/constants';
import BigNumber from 'bignumber.js';
let mcall,
  maker,
  address,
  watcher,
  snapshotData,
  cdpMgr,
  cdpTypeService,
  ethAInfo,
  batAInfo,
  vault;
import { createCurrencyRatio } from '@makerdao/currency';

import schemas, {
  TOTAL_ENCUMBERED_DEBT,
  DEBT_SCALING_FACTOR,
  PRICE_WITH_SAFETY_MARGIN,
  DEBT_CEILING,
  URN_DEBT_FLOOR,
  PROXY_ADDRESS,
  TOTAL_DAI_SUPPLY,
  PRICE_FEED_ADDRESS,
  RAW_LIQUIDATION_RATIO,
  RATIO_DAI_USD,
  LIQUIDATION_RATIO,
  ILK_PRICES
} from '../src/schema';

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

  address = maker.service('web3').currentAddress();
  cdpMgr = maker.service(ServiceRoles.CDP_MANAGER);
  cdpTypeService = maker.service(ServiceRoles.CDP_TYPE);

  vault = await setupFn();

  ethAInfo = await cdpTypeService.getCdpType(ETH, 'ETH-A').ilkInfo();
  batAInfo = await cdpTypeService.getCdpType(BAT, 'BAT-A').ilkInfo();
});

test(TOTAL_ENCUMBERED_DEBT, async () => {
  // TODO Define hardcoded rates for given ilks outside of the system and test
  // against those rather than data extracted from the chain
  const { rate: ethARate } = ethAInfo;
  const { rate: batARate } = batAInfo;

  const ethADebtAmount = ETH_A_DEBT_AMOUNT._amount;
  const batADebtAmount = BAT_A_DEBT_AMOUNT._amount;

  const ethAEncumberedDebt = await maker.latest(TOTAL_ENCUMBERED_DEBT, 'ETH-A');
  const batAEncumberedDebt = await maker.latest(TOTAL_ENCUMBERED_DEBT, 'BAT-A');

  expect(isBigNumber(ethAEncumberedDebt)).toEqual(true);
  expect(isBigNumber(batAEncumberedDebt)).toEqual(true);

  expect(ethAEncumberedDebt).toEqual(
    ethADebtAmount
      .shiftedBy(18)
      .div(fromRay(ethARate))
      .integerValue(0)
  );

  expect(batAEncumberedDebt).toEqual(
    batADebtAmount
      .shiftedBy(18)
      .div(fromRay(batARate))
      .integerValue(0)
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

  expect(isBigNumber(ethADebtCeiling)).toEqual(true);
  expect(isBigNumber(batADebtCeiling)).toEqual(true);

  expect(ethADebtCeiling).toEqual(BigNumber('100000'));
  expect(batADebtCeiling).toEqual(BigNumber('5000'));
});

test(URN_DEBT_FLOOR, async () => {
  const ethAUrnDebtFloor = await maker.latest(URN_DEBT_FLOOR, 'ETH-A');
  const batAUrnDebtFloor = await maker.latest(URN_DEBT_FLOOR, 'BAT-A');

  expect(isBigNumber(ethAUrnDebtFloor)).toEqual(true);
  expect(isBigNumber(batAUrnDebtFloor)).toEqual(true);

  expect(ethAUrnDebtFloor).toEqual(BigNumber('0'));
  expect(batAUrnDebtFloor).toEqual(BigNumber('0'));
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

test(PROXY_ADDRESS, async () => {
  const proxyAddress = await maker.latest(PROXY_ADDRESS, address);

  expect(isValidAddressString(proxyAddress)).toEqual(true);
  expect(proxyAddress).toEqual('0xC21eDD3d1Ba1bCCD67008B680b362ce6F344DaB3');
});

test(PRICE_FEED_ADDRESS, async () => {
  const ethAPriceFeedAddress = await maker.latest(PRICE_FEED_ADDRESS, 'ETH-A');
  const batAPriceFeedAddress = await maker.latest(PRICE_FEED_ADDRESS, 'BAT-A');

  expect(isValidAddressString(ethAPriceFeedAddress)).toEqual(true);
  expect(isValidAddressString(batAPriceFeedAddress)).toEqual(true);

  expect(ethAPriceFeedAddress).toEqual(
    '0xaF14E6E871f81BB92f151AfF1bB80936Aa06C6D6'
  );
  expect(batAPriceFeedAddress).toEqual(
    '0x7eD0d0255153050e9623FfECEeE49a1020503CA3'
  );
});

test(RAW_LIQUIDATION_RATIO, async () => {
  const ethARawLiquidationRatio = await maker.latest(
    RAW_LIQUIDATION_RATIO,
    'ETH-A'
  );
  const batARawLiquidationRatio = await maker.latest(
    RAW_LIQUIDATION_RATIO,
    'BAT-A'
  );

  expect(ethARawLiquidationRatio).toEqual(BigNumber('1.5'));
  expect(batARawLiquidationRatio).toEqual(BigNumber('2.0'));
});

test(LIQUIDATION_RATIO, async () => {
  const ethALiquidationRatio = await maker.latest(LIQUIDATION_RATIO, 'ETH-A');
  const batALiquidationRatio = await maker.latest(LIQUIDATION_RATIO, 'BAT-A');

  expect(ethALiquidationRatio.symbol).toEqual('(ETH/USD)/(MDAI/USD)');
  expect(batALiquidationRatio.symbol).toEqual('(BAT/USD)/(MDAI/USD)');

  expect(ethALiquidationRatio.toNumber()).toEqual(1.5);
  expect(batALiquidationRatio.toNumber()).toEqual(2.0);
});

test(RATIO_DAI_USD, async () => {
  const ratio = await maker.latest(RATIO_DAI_USD);
  expect(ratio.symbol).toEqual('MDAI/USD');
  expect(ratio.toNumber()).toEqual(1);
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
