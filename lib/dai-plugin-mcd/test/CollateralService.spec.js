import Maker from '@makerdao/dai';
import { mcdMaker } from './helpers';
import { REP } from '../src';
import { getIlkForCurrency } from '../src/utils';
const { DAI, ETH } = Maker;

let maker;

beforeAll(async () => {
  maker = await mcdMaker();
});

test('get total collateral', async () => {
	const service = maker.service('collateral');
 	const collateral = await service.totalCollateral(0);
});