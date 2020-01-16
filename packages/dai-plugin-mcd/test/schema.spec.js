import { mcdMaker, setupCollateral } from './helpers';
import { ETH, BAT, MDAI } from '../src';
import {
  toHex,
  fromRad,
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
  totalDaiSupply
} from '../src/schema';
import { first } from 'rxjs/operators';
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

const giveLatest = obs$ => obs$.pipe(first()).toPromise();

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

test(totalEncumberedDebt, async () => {
  // TODO Define hardcoded rates for given ilks outside of the system and test
  // against those rather than data extracted from the chain
  const { rate: ethARate } = ethAInfo;
  const { rate: batARate } = batAInfo;

  const ethADebtAmount = ETH_A_DEBT_AMOUNT._amount;
  const batADebtAmount = BAT_A_DEBT_AMOUNT._amount;

  const ethAEncumberedDebt = await giveLatest(
    maker.watch(totalEncumberedDebt, 'ETH-A')
  );
  const batAEncumberedDebt = await giveLatest(
    maker.watch(totalEncumberedDebt, 'BAT-A')
  );

  expect(isBigNumber(ethAEncumberedDebt)).toEqual(true);
  expect(isBigNumber(batAEncumberedDebt)).toEqual(true);

  expect(ethAEncumberedDebt.toString()).toEqual(
    ethADebtAmount
      .shiftedBy(18)
      .div(fromRay(ethARate))
      .toFixed(0, 0)
  );

  expect(batAEncumberedDebt.toString()).toEqual(
    batADebtAmount
      .shiftedBy(18)
      .div(fromRay(batARate))
      .toFixed(0, 0)
  );
});

test(debtScalingFactor, async () => {
  const { rate } = ethAInfo;
  const debtScalingFactor$ = mcall.watchObservable(debtScalingFactor, 'ETH-A');
  const res = await debtScalingFactor$.pipe(first()).toPromise();
  expect(isBigNumber(res)).toEqual(true);
  expect(res.toString()).toEqual(fromRay(rate).toString());
});

test(priceWithSafetyMargin, async () => {
  const priceWithSafetyMargin$ = mcall.watchObservable(
    priceWithSafetyMargin,
    'ETH-A'
  );
  const res = await priceWithSafetyMargin$.pipe(first()).toPromise();
  expect(isBigNumber(res)).toEqual(true);
  expect(res.toString()).toEqual('120');
});

test(debtCeiling, async () => {
  const debtCeiling$ = mcall.watchObservable(debtCeiling, 'ETH-A');
  const res = await debtCeiling$.pipe(first()).toPromise();
  expect(isBigNumber(res)).toEqual(true);
  expect(res.toString()).toEqual('100000');
});

test(urnDebtFloor, async () => {
  const urnDebtFloor$ = mcall.watchObservable(urnDebtFloor, 'ETH-A');
  const res = await urnDebtFloor$.pipe(first()).toPromise();
  expect(isBigNumber(res)).toEqual(true);
  expect(res.toString()).toEqual('0');
});

test(proxyAddress, async () => {
  const proxyAddress$ = mcall.watchObservable(proxyAddress, address);
  const res = await proxyAddress$.pipe(first()).toPromise();
  expect(isValidAddressString(res)).toEqual(true);
  expect(res.toString()).toEqual('0xC21eDD3d1Ba1bCCD67008B680b362ce6F344DaB3');
});

test(totalDaiSupply, async () => {
  const { Art: ethAArt, rate: ethARate } = ethAInfo;
  const { Art: batAArt, rate: batARate } = batAInfo;

  const ethADaiGenerated = MDAI.rad(BigNumber(ethAArt).times(ethARate));
  const batADaiGenerated = MDAI.rad(BigNumber(batAArt).times(batARate));

  const res = await giveLatest(maker.watch(totalDaiSupply));

  expect(res.symbol).toEqual('MDAI');
  expect(res.isEqual(ethADaiGenerated.plus(batADaiGenerated))).toEqual(true);
});

test('ilkPrices', async () => {
  const obs = mcall.watchObservable('ilkPrices', ['ETH-A', 'ETH-B']);
  const res = await obs.pipe(first()).toPromise();
  expect(res[0].toNumber()).toEqual(180);
  expect(res[0].symbol).toEqual('USD/ETH');
  expect(res[1].toNumber()).toEqual(150);
  expect(res[1].symbol).toEqual('USD/ETH');
});
