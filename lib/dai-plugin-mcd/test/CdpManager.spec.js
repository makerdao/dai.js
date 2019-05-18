import { mcdMaker, setDebtCeiling, setupCollateral } from './helpers';
import { ServiceRoles } from '../src/constants';
import { ETH, MDAI } from '../src';

// FIXME we won't be able to reach into @makerdao/dai internals like this when
// this plugin is moved into its own module...
import TestAccountProvider from '../../../test/helpers/TestAccountProvider';

let maker, cdpMgr, txMgr;

beforeAll(async () => {
  maker = await mcdMaker();
  cdpMgr = maker.service(ServiceRoles.CDP_MANAGER);
  txMgr = maker.service('transactionManager');
});

test('getCdpIds gets empty CDP data from a proxy', async () => {
  const currentProxy = await maker.currentProxy();
  const cdps = await cdpMgr.getCdpIds(currentProxy);

  expect(cdps.length).toEqual(0);
});

test('getCdpIds gets all CDP data from the proxy', async () => {
  const cdp1 = await cdpMgr.open('ETH-A');
  const cdp2 = await cdpMgr.open('ETH-B');
  cdpMgr.reset();
  const currentProxy = await maker.currentProxy();
  const cdps = await cdpMgr.getCdpIds(currentProxy);

  expect(cdps.length).toEqual(2);
  expect(cdps).toContainEqual({ id: cdp1.id, ilk: cdp1.ilk });
  expect(cdps).toContainEqual({ id: cdp2.id, ilk: cdp2.ilk });
});

test('getCombinedDebtValue', async () => {
  await setDebtCeiling(maker, MDAI(100));
  await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
  await cdpMgr.openLockAndDraw('ETH-A', ETH(1), MDAI(3));
  await cdpMgr.openLockAndDraw('ETH-A', ETH(2), MDAI(5));
  cdpMgr.reset();
  const currentProxy = await maker.currentProxy();
  const totalDebt = await cdpMgr.getCombinedDebtValue(currentProxy);
  expect(totalDebt).toEqual(MDAI(8));
});

test('getCdp looks up ilk', async () => {
  const cdp = await cdpMgr.open('ETH-A');
  const sameCdp = await cdpMgr.getCdp(cdp.id);
  expect(sameCdp.ilk).toEqual(cdp.ilk);
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
