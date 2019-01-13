import Maker from '@makerdao/dai';
import { mcdMaker } from './helpers';
import { REP } from '../src';
import { getIlkForCurrency } from '../src/utils';
const { DAI, ETH } = Maker;

let maker;

beforeAll(async () => {
  maker = await mcdMaker();
});

test('get total collateral for ETH', async () => {
	const service = maker.service('collateral');
 	const collateral = await service.getTotalCollateral(ETH);
 	expect(collateral).toBe(0);
});

test('get total debt for ETH', async () => {
	const service = maker.service('collateral');
 	const debt = await service.getTotalCollateral(ETH);
 	expect(debt).toBe(0);
});

test('get debt ceiling for ETH', async () => {
	const service = maker.service('collateral');
 	const ceiling = await service.getDebtCeiling(ETH);
 	expect(ceiling).toBe(0);
});

test('get liquidation ratio for ETH', async () => {
	const service = maker.service('collateral');
 	const ratio = await service.getLiquidationRatio(ETH);
 	expect(ratio).toBe(1);
});

test('get price for ETH', async () => {
	const service = maker.service('collateral');
 	const price = await service.getPrice(ETH);
 	expect(price).toBe(0);
});

test('get liquidation penalty for ETH', async () => {
	const service = maker.service('collateral');
 	const penalty = await service.getLiquidationPenalty(ETH);
 	expect(penalty).toBe(-1);
});
