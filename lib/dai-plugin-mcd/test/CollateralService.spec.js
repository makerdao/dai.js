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
 	const collateral = await service.getTotalCollateral(ETH);
 	expect(collateral).toBe(0);
});