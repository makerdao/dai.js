import Maker from '@makerdao/dai';
import { mcdMaker, setDebtCeiling, setPrice, mint } from './helpers';
import { REP, USD_REP } from '../src';
import { getIlkForCurrency } from '../src/utils';
const { DAI, ETH, USD_ETH } = Maker;

let maker;

beforeAll(async () => {
  maker = await mcdMaker();
  await setDebtCeiling(maker, DAI(100));
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

describe('ETH', () => {
  beforeAll(async () => {
    await setPrice(maker, USD_ETH(150));
    await setDebtCeiling(maker, DAI(50), ETH);
  });

  test('open', async () => {
    const cdp = await maker.service('cdpManager').open();
    expect(cdp.id).toBeGreaterThan(0);
    expect(await cdp.getCollateralValue(ETH)).toEqual(ETH(0));
    expect(await cdp.getDebtValue(ETH)).toEqual(DAI(0));
  });

  test('open & lock', async () => {
    const cdp = await maker.service('cdpManager').openLockAndDraw(ETH(1));
    expect(cdp.id).toBeGreaterThan(0);
    expect(await cdp.getCollateralValue()).toEqual(ETH(1));
    expect(await cdp.getDebtValue()).toEqual(DAI(0));
  });

  test('open, lock, draw', async () => {
    const cdp = await maker
      .service('cdpManager')
      .openLockAndDraw(ETH(1), DAI(1));
    expect(cdp.id).toBeGreaterThan(0);
    expect(await cdp.getCollateralValue()).toEqual(ETH(1));
    expect(await cdp.getDebtValue()).toEqual(DAI(1));
  });
});

describe('REP', () => {
  beforeAll(async () => {
    await mint(maker, REP(10));
    await maker.getToken('REP').approveUnlimited(maker.currentProxy());
    await setPrice(maker, USD_REP(100));
    await setDebtCeiling(maker, DAI(50), REP);
  });

  test('open & lock', async () => {
    const cdp = await maker.service('cdpManager').openLockAndDraw(REP(1));
    expect(cdp.id).toBeGreaterThan(0);
    expect(await cdp.getCollateralValue()).toEqual(REP(1));
    expect(await cdp.getDebtValue()).toEqual(DAI(0));
  });

  test('open, lock, draw', async () => {
    const cdp = await maker
      .service('cdpManager')
      .openLockAndDraw(REP(1), DAI(1));
    expect(cdp.id).toBeGreaterThan(0);
    expect(await cdp.getCollateralValue()).toEqual(REP(1));
    expect(await cdp.getDebtValue()).toEqual(DAI(1));
  });
});
