import Maker from '@makerdao/dai';
import { mcdMaker } from './helpers';
import { REP } from '../src';

let maker;

beforeAll(async () => {
  maker = await mcdMaker();
});

test('check ETH ilk data', async () => {
  const mcs = maker.service('multiCdp');
  const ilk = await mcs.vat.ilks(mcs.ilk(Maker.ETH));
  expect(ilk.take.toString()).toEqual('1000000000000000000000000000');
});

test('check REP ilk data', async () => {
  const mcs = maker.service('multiCdp');
  const ilk = await mcs.vat.ilks(mcs.ilk(REP));
  expect(ilk.take.toString()).toEqual('1000000000000000000000000000');
});

test('check fake collateral type', async () => {
  const mcs = maker.service('multiCdp');
  const ilk = await mcs.vat.ilks(mcs.ilk({ symbol: 'ZZZ' }));
  expect(ilk.take.toString()).toEqual('0');
});
