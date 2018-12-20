import Maker from '@makerdao/dai';
import { mcdMaker } from './helpers';
import { REP } from '../src';
import { getIlkForCurrency } from '../src/utils';
const { ETH } = Maker;

let maker;

beforeAll(async () => {
  maker = await mcdMaker();
});

test('check ETH ilk data', async () => {
  const mgr = maker.service('cdpManager');
  const ilk = await mgr.vat.ilks(getIlkForCurrency(ETH));
  expect(ilk.take.toString()).toEqual('1000000000000000000000000000');
});

test('check REP ilk data', async () => {
  const mgr = maker.service('cdpManager');
  const ilk = await mgr.vat.ilks(getIlkForCurrency(REP));
  expect(ilk.take.toString()).toEqual('1000000000000000000000000000');
});

test('check fake collateral type', async () => {
  const mgr = maker.service('cdpManager');
  const ilk = await mgr.vat.ilks(getIlkForCurrency({ symbol: 'ZZZ' }));
  expect(ilk.take.toString()).toEqual('0');
});

// this test assumes the current account has a proxy already, which is true
// for the first account because of
test('openLockAndDraw, lock only', async () => {
  const cdp = await maker.service('cdpManager').openLockAndDraw(ETH(1));
  expect(cdp.id).toBeGreaterThan(0);
  const locked = await cdp.getLockedAmount();
  expect(locked.eq(ETH(1))).toBeTruthy();
});
