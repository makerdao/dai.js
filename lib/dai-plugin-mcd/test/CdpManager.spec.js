import Maker from '@makerdao/dai';
import { mcdMaker, setDebtCeiling, setPrice } from './helpers';
import { REP } from '../src';
import { getIlkForCurrency } from '../src/utils';
const { DAI, ETH, USD_ETH } = Maker;

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

// these tests assume the current account has a proxy already, which is true
// for the first account only because the testchain setup script creates one

test('open', async () => {
  const cdp = await maker.service('cdpManager').open();
  expect(cdp.id).toBeGreaterThan(0);
  expect(await cdp.getCollateralValue(ETH)).toEqual(ETH(0));
  expect(await cdp.getDebtValue(ETH)).toEqual(DAI(0));
});

test('open & lock ETH', async () => {
  const cdp = await maker.service('cdpManager').openLockAndDraw(ETH(1));
  expect(cdp.id).toBeGreaterThan(0);
  expect(await cdp.getCollateralValue()).toEqual(ETH(1));
  expect(await cdp.getDebtValue()).toEqual(DAI(0));
});

test('open, lock ETH, draw Dai', async () => {
  await setPrice(maker, USD_ETH(123.45));
  await setDebtCeiling(maker, DAI(2468));
  await setDebtCeiling(maker, DAI(1357), ETH);

  const cdp = await maker.service('cdpManager').openLockAndDraw(ETH(1), DAI(1));
  expect(cdp.id).toBeGreaterThan(0);
  expect(await cdp.getCollateralValue()).toEqual(ETH(1));
  expect(await cdp.getDebtValue()).toEqual(DAI(1));
});

test.skip('open & lock REP', async () => {
  // fund the test account with some REP; this works becuse the first test
  // account owns the REP contract
  const rep = maker.getToken('REP');
  await rep._contract['mint(uint256)'](REP(10).toEthersBigNumber('wei'));
  expect(await rep.balance()).toEqual(REP(10));

  const cdp = await maker.service('cdpManager').openLockAndDraw(REP(1));
  expect(cdp.id).toBeGreaterThan(0);
  expect(cdp.getCollateralValue()).toEqual(REP(1));
});
