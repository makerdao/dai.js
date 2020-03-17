import findIndex from 'lodash/findIndex';
import { mcdMaker, setupCollateral } from './helpers';
import { setMethod, transferToBag } from '../src/CdpManager';
import { ServiceRoles } from '../src/constants';
import { ETH, MDAI, GNT, DGD, BAT } from '../src';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';

let maker, cdpMgr, txMgr, snapshotData;

beforeAll(async () => {
  maker = await mcdMaker({
    cdpTypes: [
      { currency: ETH, ilk: 'ETH-A' },
      { currency: DGD, ilk: 'DGD-A', decimals: 9 },
      { currency: GNT, ilk: 'GNT-A' },
      { currency: BAT, ilk: 'BAT-A' }
    ]
  });
  cdpMgr = maker.service(ServiceRoles.CDP_MANAGER);
  txMgr = maker.service('transactionManager');
  snapshotData = await takeSnapshot(maker);
});

afterEach(() => {
  cdpMgr.reset();
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test('getCdpIds gets empty CDP data from a proxy', async () => {
  const currentProxy = await maker.currentProxy();
  const cdps = await cdpMgr.getCdpIds(currentProxy);

  expect(cdps.length).toEqual(0);
});

test('getCdpIds gets all CDP data from the proxy', async () => {
  const cdp1 = await cdpMgr.open('ETH-A');
  const cdp2 = await cdpMgr.open('BAT-A');
  const currentProxy = await maker.currentProxy();
  const cdps = await cdpMgr.getCdpIds(currentProxy);

  expect(cdps.length).toEqual(2);
  expect(cdps).toContainEqual({ id: cdp1.id, ilk: cdp1.ilk });
  expect(cdps).toContainEqual({ id: cdp2.id, ilk: cdp2.ilk });
});

test('getCombinedDebtValue', async () => {
  await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
  await cdpMgr.openLockAndDraw('ETH-A', ETH(1), MDAI(3));
  await cdpMgr.openLockAndDraw('ETH-A', ETH(2), MDAI(5));
  maker.service(ServiceRoles.CDP_TYPE).reset();
  const currentProxy = await maker.currentProxy();
  const totalDebt = await cdpMgr.getCombinedDebtValue(currentProxy);
  expect(totalDebt.toNumber()).toBeCloseTo(8, 1);
});

test('getCdp looks up ilk and has cache', async () => {
  const cdp = await cdpMgr.open('ETH-A');
  const sameCdp = await cdpMgr.getCdp(cdp.id);
  expect(sameCdp.ilk).toEqual(cdp.ilk);
  expect(cdp).toBe(sameCdp);

  const differentInstance = await cdpMgr.getCdp(cdp.id, { cache: false });
  expect(differentInstance).not.toBe(cdp);
});

test('getIlkForCdp returns the ilk of a specific CDP', async () => {
  const cdp = await cdpMgr.open('ETH-A');
  const ilk = await cdpMgr.getIlkForCdp(cdp.id);
  expect(ilk).toBe('ETH-A');
});

test('getCdp can disable prefetch', async () => {
  const cdp = await cdpMgr.open('ETH-A');
  const sameCdp = await cdpMgr.getCdp(cdp.id, {
    prefetch: false,
    cache: false
  });
  expect(sameCdp._urnInfoPromise).toBeUndefined();
});

test('transaction tracking for openLockAndDraw', async () => {
  const cdpMgr = maker.service(ServiceRoles.CDP_MANAGER);
  const txMgr = maker.service('transactionManager');
  const open = cdpMgr.openLockAndDraw('ETH-A', ETH(1), MDAI(0));
  expect.assertions(5);
  const handlers = {
    pending: jest.fn(({ metadata: { contract, method } }) => {
      expect(contract).toBe('PROXY_ACTIONS');
      expect(method).toBe('openLockETHAndDraw');
    }),
    mined: jest.fn(tx => {
      expect(tx.hash).toBeTruthy();
    })
  };
  txMgr.listen(open, handlers);
  await open;
  expect(handlers.pending).toBeCalled();
  expect(handlers.mined).toBeCalled();
});

test('set precision arguments according to decimals', () => {
  expect(cdpMgr._precision(ETH(1))).toBe('wei');
  expect(cdpMgr._precision(GNT(1))).toBe(18);
  expect(cdpMgr._precision(DGD(1))).toBe(9);
});

test('set method correctly', () => {
  expect(setMethod(true, false, 1)).toBe('lockETHAndDraw');
  expect(setMethod(true)).toBe('openLockETHAndDraw');
  expect(setMethod(false, false, 1)).toBe('lockGemAndDraw');
  expect(setMethod()).toBe('openLockGemAndDraw');
  expect(setMethod(false, true)).toBe('openLockGNTAndDraw');
});

test('transferToBag for GNT CDPs', async () => {
  const gntToken = maker.service('token').getToken(GNT);
  const proxyAddress = await maker.service('proxy').currentProxy();
  const bagAddress = await maker
    .service('smartContract')
    .getContract('MCD_JOIN_GNT_A')
    .bags(proxyAddress);

  const startingBalance = await gntToken.balanceOf(bagAddress);
  await transferToBag(GNT(1), proxyAddress, cdpMgr);
  const endingBalance = await gntToken.balanceOf(bagAddress);

  expect(startingBalance.toNumber()).toEqual(0);
  expect(endingBalance.toNumber()).toEqual(1);
});

describe('using a different account', () => {
  let mgr, cdpId;

  beforeAll(async () => {
    const account2 = TestAccountProvider.nextAccount();
    await maker.addAccount({ ...account2, type: 'privateKey' });
    maker.useAccount(account2.address);
    mgr = maker.service(ServiceRoles.CDP_MANAGER);
  });

  afterAll(() => {
    maker.useAccount('default');
  });

  test('create proxy during open', async () => {
    expect(await maker.currentProxy()).toBeFalsy();
    const open = mgr.openLockAndDraw('ETH-A', ETH(2));

    const handler = jest.fn((tx, state) => {
      const label = tx.metadata.contract + '.' + tx.metadata.method;
      switch (handler.mock.calls.length) {
        case 1:
          expect(state).toBe('pending');
          expect(label).toBe('PROXY_REGISTRY.build');
          break;
        case 2:
          expect(state).toBe('mined');
          expect(label).toBe('PROXY_REGISTRY.build');
          break;
        case 3:
          expect(state).toBe('pending');
          expect(label).toBe('PROXY_ACTIONS.openLockETHAndDraw');
          break;
        case 4:
          expect(state).toBe('mined');
          expect(label).toBe('PROXY_ACTIONS.openLockETHAndDraw');
          break;
      }
    });
    txMgr.listen(open, handler);
    const cdp = await open;
    expect(handler.mock.calls.length).toBe(4);
    expect(cdp.id).toBeGreaterThan(0);
    cdpId = cdp.id;
    expect(await maker.currentProxy()).toBeTruthy();
  });

  test("prevent access to a CDP you don't own", async () => {
    maker.useAccount('default');
    const cdp = await mgr.getCdp(cdpId);
    expect.assertions(1);
    try {
      await cdp.freeCollateral(ETH(1));
    } catch (err) {
      expect(err.message).toMatch(/revert/);
    }
  });
});

test('get event history via web3', async () => {
  await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
  const cdp = await cdpMgr.openLockAndDraw('ETH-A', ETH(1), MDAI(3));
  await cdp.freeCollateral(ETH(0.5));
  await cdpMgr.give(cdp.id, '0x1000000000000000000000000000000000000000');
  const events = await cdpMgr.getEventHistory(cdp);

  const openEventIdx = findIndex(events, { type: 'OPEN', id: cdp.id });
  const depositEventIdx = findIndex(events, { type: 'DEPOSIT', id: cdp.id });
  const generateEventIdx = findIndex(events, { type: 'GENERATE', id: cdp.id });
  const withdrawEventIdx = findIndex(events, { type: 'WITHDRAW', id: cdp.id });
  const giveEventIdx = findIndex(events, { type: 'GIVE', id: cdp.id });

  expect(openEventIdx).toBeGreaterThan(-1);
  expect(events[openEventIdx].ilk).toEqual('ETH-A');

  expect(depositEventIdx).toBeGreaterThan(-1);
  expect(events[depositEventIdx].ilk).toEqual('ETH-A');
  expect(events[depositEventIdx].gem).toEqual('ETH');
  expect(events[depositEventIdx].amount).toEqual('1');

  expect(generateEventIdx).toBeGreaterThan(-1);
  expect(events[generateEventIdx].ilk).toEqual('ETH-A');
  expect(events[generateEventIdx].amount).toEqual('3');

  expect(withdrawEventIdx).toBeGreaterThan(-1);
  expect(events[withdrawEventIdx].ilk).toEqual('ETH-A');
  expect(events[withdrawEventIdx].gem).toEqual('ETH');
  expect(events[withdrawEventIdx].amount).toEqual('0.5');

  expect(giveEventIdx).toBeGreaterThan(-1);
  expect(events[giveEventIdx].newOwner).toEqual(
    '0x1000000000000000000000000000000000000000'
  );

  const cachedEvents = await cdpMgr.getEventHistory(cdp);
  const openCachedEventIdx = findIndex(cachedEvents, {
    type: 'OPEN',
    id: cdp.id
  });
  expect(openCachedEventIdx).toBeGreaterThan(-1);
});
