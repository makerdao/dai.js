import { mcdMaker, setupCollateral } from './helpers';
import { ETH, BAT, MDAI } from '../src';
import {
  toHex,
  fromRad,
  fromWei,
  fromRay,
  isBigNumber,
  isValidAddressString
} from '../src/utils';
import schemas, {
  totalEncumberedDebt,
  debtScalingFactor,
  priceWithSafetyMargin,
  debtCeiling,
  urnDebtFloor,
  proxyAddress,
  totalDaiSupply,
  unlockedCollateral,
  urnInk,
  urnArt
} from '../src/schema';
import { ServiceRoles } from '../src/constants';
import BigNumber from 'bignumber.js';
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
  proxyService = maker.service('proxy');

  vault = await setupFn();

  ethAInfo = await cdpTypeService.getCdpType(ETH, 'ETH-A').ilkInfo();
  batAInfo = await cdpTypeService.getCdpType(BAT, 'BAT-A').ilkInfo();
});

test(totalEncumberedDebt, async () => {
  // TODO Define hardcoded rates for given ilks outside of the system and test
  // against those rather than data extracted from the chain
  const { rate: ethARate } = ethAInfo;
  const { rate: batARate } = batAInfo;

  const ethADebtAmount = ETH_A_DEBT_AMOUNT._amount;
  const batADebtAmount = BAT_A_DEBT_AMOUNT._amount;

  const ethAEncumberedDebt = await maker.latest(totalEncumberedDebt, 'ETH-A');
  const batAEncumberedDebt = await maker.latest(totalEncumberedDebt, 'BAT-A');

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

test(debtScalingFactor, async () => {
  const { rate: ethARate } = ethAInfo;
  const { rate: batARate } = batAInfo;

  const ethADebtScalingFactor = await maker.latest(debtScalingFactor, 'ETH-A');
  const batADebtScalingFactor = await maker.latest(debtScalingFactor, 'BAT-A');

  expect(isBigNumber(ethADebtScalingFactor)).toEqual(true);
  expect(isBigNumber(batADebtScalingFactor)).toEqual(true);

  expect(ethADebtScalingFactor).toEqual(fromRay(ethARate));
  expect(batADebtScalingFactor).toEqual(fromRay(batARate));
});

test(priceWithSafetyMargin, async () => {
  const ethAPriceWithSafetyMargin = await maker.latest(
    priceWithSafetyMargin,
    'ETH-A'
  );
  const batAPriceWithSafetyMargin = await maker.latest(
    priceWithSafetyMargin,
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

test(debtCeiling, async () => {
  const ethADebtCeiling = await maker.latest(debtCeiling, 'ETH-A');
  const batADebtCeiling = await maker.latest(debtCeiling, 'BAT-A');

  expect(isBigNumber(ethADebtCeiling)).toEqual(true);
  expect(isBigNumber(batADebtCeiling)).toEqual(true);

  expect(ethADebtCeiling).toEqual(BigNumber('100000'));
  expect(batADebtCeiling).toEqual(BigNumber('5000'));
});

test(urnDebtFloor, async () => {
  const ethAUrnDebtFloor = await maker.latest(urnDebtFloor, 'ETH-A');
  const batAUrnDebtFloor = await maker.latest(urnDebtFloor, 'BAT-A');

  expect(isBigNumber(ethAUrnDebtFloor)).toEqual(true);
  expect(isBigNumber(batAUrnDebtFloor)).toEqual(true);

  expect(ethAUrnDebtFloor).toEqual(BigNumber('0'));
  expect(batAUrnDebtFloor).toEqual(BigNumber('0'));
});

test(totalDaiSupply, async () => {
  const { Art: ethAArt, rate: ethARate } = ethAInfo;
  const { Art: batAArt, rate: batARate } = batAInfo;

  const ethADaiGenerated = MDAI.rad(BigNumber(ethAArt).times(ethARate));
  const batADaiGenerated = MDAI.rad(BigNumber(batAArt).times(batARate));
  const sumOfDaiGeneratedFromIlks = ethADaiGenerated.plus(batADaiGenerated);

  const totalDaiAmount = await maker.latest(totalDaiSupply);

  expect(totalDaiAmount.symbol).toEqual('MDAI');
  expect(totalDaiAmount.isEqual(sumOfDaiGeneratedFromIlks)).toEqual(true);
});

test(proxyAddress, async () => {
  const proxy = await maker.latest(proxyAddress, address);
  expect(isValidAddressString(proxy)).toEqual(true);
  expect(proxy).toEqual('0xC21eDD3d1Ba1bCCD67008B680b362ce6F344DaB3');
});

test.skip('ilkPrices', async () => {
  const [ethAPrice, ethBPrice, batAPrice] = await maker.latest('ilkPrices', [
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

test('unlockedCollateral', async () => {
  const cdpId = 1;
  const expected = 0;
  const col = await maker.latest(unlockedCollateral, 'ETH-A', await cdpMgr.getUrn(cdpId));

  expect(col).toEqual(fromWei(expected));
});

test('urnInk', async () => {
  const cdpId = 1;
  const expected = fromWei(1000000000000000000);
  const col = await maker.latest(urnInk, 'ETH-A', await cdpMgr.getUrn(cdpId));

  expect(col).toEqual(expected);
});

test('urnArt', async () => {
  const cdpId = 1;
  const expected = fromWei(995000000000000000);
  const col = await maker.latest(urnArt, 'ETH-A', await cdpMgr.getUrn(cdpId));

  expect(col.toNumber()).toBeCloseTo(expected.toNumber());
});