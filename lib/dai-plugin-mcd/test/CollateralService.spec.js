import Maker from '@makerdao/dai';
import { mcdMaker } from './helpers';
import { REP } from '../src';
import { getIlkForCurrency } from '../src/utils';
const { DAI, ETH } = Maker;

let service;
let ethCdpType;

beforeAll(async () => {
  const maker = await mcdMaker();
  service = maker.service('collateral');
  ethCdpType = service.getCdpTypeObject(ETH);
});

test('get total collateral for ETH', async () => {
 	const collateral = await ethCdpType.getTotalCollateral();
 	expect(collateral).toBe(0);
});

test('get total debt for ETH', async () => {
 	const debt = await ethCdpType.getTotalDebt();
 	expect(debt).toBe(0);
});

test('get debt ceiling for ETH', async () => {
 	const ceiling = await ethCdpType.getDebtCeiling();
 	expect(ceiling).toBe(0);
});

test('get liquidation ratio for ETH', async () => {
 	const ratio = await ethCdpType.getLiquidationRatio();
 	expect(ratio).toBe(1);
});

test('get price for ETH', async () => {
 	const price = await ethCdpType.getPrice();
 	expect(price).toBe(0);
});

test('get liquidation penalty for ETH', async () => {
 	const penalty = await ethCdpType.getLiquidationPenalty();
 	expect(penalty).toBe(0);
});

test('get annual stability fee for ETH', async () => {
 	const penalty = await ethCdpType.getAnnualStabilityFee();
 	expect(penalty).toBe(0);
});

test('get max bid lifetime', async () => {
 	const time = await ethCdpType.getMaxBidLifetime();
 	expect(time).toBe(3);
});

test('get max auction duration', async () => {
 	const time = await ethCdpType.getMaxAuctionDuration();
 	expect(time).toBe(2);
});

test('get min bid increase', async () => {
 	const time = await ethCdpType.getMinBidIncrease();
 	expect(time).toBe(0.05);
});

test('get annual savings rate', async () => {
 	const rate = await service.getAnnualSavingsRate();
 	expect(rate).toBe(0);
});

test('get system-wide debt ceiling', async () => {
 	const ceiling = await service.getSystemWideDebtCeiling();
 	expect(ceiling).toBe(0);
});
