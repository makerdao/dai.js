import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { mcdMaker, setupCollateral } from './helpers';
import { ETH, REP, MDAI, USD, GNT, OMG, DGD } from '../src';
import { ServiceRoles } from '../src/constants';
import { dummyEventData, formattedDummyEventData } from './fixtures';
import { createCurrencyRatio } from '@makerdao/currency';

const { CDP_MANAGER, QUERY_API } = ServiceRoles;

let dai, maker, proxy, snapshotData, txMgr;

beforeAll(async () => {
  maker = await mcdMaker();
  dai = maker.getToken(MDAI);
  // the current account has a proxy only because the testchain setup script
  // creates it -- this is probably not a future-proof assumption
  proxy = await maker.currentProxy();
  txMgr = maker.service('transactionManager');
  snapshotData = await takeSnapshot(maker);
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test('prevent locking the wrong collateral type', async () => {
  const cdp = await maker.service(CDP_MANAGER).open('REP-A');
  expect.assertions(1);
  try {
    await cdp.lockCollateral(ETH(1));
  } catch (err) {
    expect(err.message).toMatch(/Can't cast 1.00 ETH as REP/);
  }
});

test('prevent freeing the wrong collateral type', async () => {
  const cdp = await maker.service(CDP_MANAGER).open('REP-A');
  expect.assertions(1);
  try {
    await cdp.freeCollateral(ETH(1));
  } catch (err) {
    expect(err.message).toMatch(/Can't cast 1.00 ETH as REP/);
  }
});

test('liquidationPrice and collateralizationRatio are infinite with 0 collateral and 0 debt', async () => {
  const cdp = await maker.service(CDP_MANAGER).open('REP-A');
  await cdp.prefetch();
  const ratio = createCurrencyRatio(USD, REP);
  const ratio2 = createCurrencyRatio(USD, MDAI);
  expect(cdp.liquidationPrice).toEqual(ratio(Infinity));
  expect(cdp.collateralizationRatio).toEqual(ratio2(Infinity));
});

async function expectValuesAfterReset(cdp, values) {
  cdp.reset();
  await cdp.prefetch();
  return expectValues(cdp, values);
}

async function expectValues(
  cdp,
  {
    collateral,
    debt,
    myGem,
    myDai,
    collateralValue,
    ratio,
    isSafe,
    daiAvailable
  }
) {
  if (collateral !== undefined) {
    expect(cdp.collateralAmount).toEqual(cdp.currency(collateral));
  }
  if (debt !== undefined) {
    expect(cdp.debtValue.toNumber()).toBeCloseTo(debt, 1);
  }
  if (myGem !== undefined) {
    const balance = await maker.getToken(cdp.currency).balance();
    if (cdp.currency === ETH) {
      // account for gas costs by checking that the value is in a range
      expect(balance.toNumber()).toBeLessThan(myGem.toNumber());
      expect(balance.toNumber()).toBeGreaterThan(myGem.minus(0.05).toNumber());
    } else {
      expect(balance).toEqual(myGem);
    }
  }
  if (myDai !== undefined) {
    const balance = await dai.balance();
    expect(balance.toNumber()).toBeCloseTo(myDai.toNumber());
  }
  if (collateralValue !== undefined) {
    const minVal = cdp.debtValue
      .times(cdp.type.liquidationRatio)
      .div(collateralValue);
    expect(cdp.collateralValue.toNumber()).toBe(collateralValue);
    expect(cdp.minSafeCollateralAmount.toNumber()).toBe(minVal.toNumber());
    expect(cdp.collateralAvailable.toNumber()).toBe(
      cdp.collateralAmount.minus(minVal.toNumber()).toNumber()
    );
  }
  if (ratio !== undefined) {
    expect(cdp.collateralizationRatio.toNumber()).toBe(ratio);
  }
  if (isSafe !== undefined) {
    expect(cdp.isSafe).toBe(isSafe);
  }
  if (daiAvailable !== undefined) {
    cdp.daiAvailable.eq(MDAI(daiAvailable));
  }
}

// ZRX and BAT use the same adapter as ETH and REP, so they
// don't need to be tested.
describe.each([
  [
    'ETH-A',
    ETH,
    async () => setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 })
  ],
  [
    'REP-A',
    REP,
    async () => setupCollateral(maker, 'REP-A', { price: 100, debtCeiling: 50 })
  ],
  [
    'GNT-A',
    GNT,
    async () => setupCollateral(maker, 'GNT-A', { price: 100, debtCeiling: 50 })
  ],
  [
    'OMG-A',
    OMG,
    async () => setupCollateral(maker, 'OMG-A', { price: 100, debtCeiling: 50 })
  ],
  [
    'DGD-A',
    DGD,
    async () => setupCollateral(maker, 'DGD-A', { price: 100, debtCeiling: 50 })
  ]
])('%s', (ilk, GEM, setup) => {
  let startingGemBalance, startingDaiBalance;

  beforeAll(async () => {
    await setup();
    await dai.approveUnlimited(proxy);
  });

  beforeEach(async () => {
    startingGemBalance = await maker.getToken(GEM).balance();
    startingDaiBalance = await dai.balance();
  });

  test('open', async () => {
    const cdp = await maker.service(CDP_MANAGER).open(ilk);
    expect(cdp.id).toBeGreaterThan(0);
    await expectValues(cdp, { collateral: 0, debt: 0 });
  });

  test('getEventHistory', async () => {
    const mockFn = jest.fn(async () => dummyEventData(ilk));
    maker.service(QUERY_API).getCdpEventsForIlkAndUrn = mockFn;
    const cdp = await maker.service(CDP_MANAGER).open(ilk);
    const events = await cdp.getEventHistory();
    expect(mockFn).toBeCalled();
    expect(events).toEqual(formattedDummyEventData(GEM, ilk));
  });

  test('getOwner', async () => {
    const cdp = await maker.service(CDP_MANAGER).open(ilk);
    const proxy = await maker.service('proxy').currentProxy();
    expect(await cdp.getOwner()).toBe(proxy);
  });

  test('openLock, lock, lockAndDraw, free', async () => {
    const cdp = await maker.service(CDP_MANAGER).openLockAndDraw(ilk, GEM(1));
    await expectValues(cdp, {
      collateral: 1,
      debt: 0,
      myGem: startingGemBalance.minus(1)
    });
    await cdp.lockCollateral(1);
    await expectValuesAfterReset(cdp, {
      collateral: 2,
      myGem: startingGemBalance.minus(2)
    });

    await cdp.lockAndDraw(1, 5);
    await expectValuesAfterReset(cdp, {
      collateral: 3,
      debt: 5,
      myDai: startingDaiBalance.plus(5),
      myGem: startingGemBalance.minus(3)
    });

    await cdp.freeCollateral(0.8);
    await expectValuesAfterReset(cdp, {
      collateral: 2.2,
      myGem: startingGemBalance.minus(2.2)
    });
  });

  test('openLockAndDraw, get, draw, wipe, wipeAndFree', async () => {
    const txStates = ['pending', 'mined', 'confirmed'];
    const mgr = maker.service(CDP_MANAGER);
    const cdp = await mgr.openLockAndDraw(ilk, GEM(1), MDAI(1));
    await expectValues(cdp, {
      collateral: 1,
      debt: 1,
      myDai: startingDaiBalance.plus(1),
      myGem: startingGemBalance.minus(1)
    });
    cdp.type.reset();
    await cdp.type.prefetch();
    await expectValues(cdp, {
      val: cdp.type.price.toNumber(),
      ratio: cdp.type.price.toNumber(),
      isSafe: true,
      daiAvailable: '149'
    });

    const sameCdp = await mgr.getCdp(cdp.id);
    await expectValues(sameCdp, { collateral: 1, debt: 1 });

    const urn = await cdp.getUrn();
    expect(urn.length).toBe(42);

    const draw = cdp.drawDai(1);
    const drawHandler = jest.fn((tx, state) => {
      expect(tx.metadata.method).toBe(
        `lock${GEM == ETH ? 'ETH' : 'Gem'}AndDraw`
      );
      expect(state).toBe(txStates[drawHandler.mock.calls.length - 1]);
    });
    txMgr.listen(draw, drawHandler);
    await draw;
    expect(drawHandler.mock.calls.length).toBe(2);
    await expectValuesAfterReset(cdp, {
      debt: 2,
      myDai: startingDaiBalance.plus(2)
    });

    const wipe = cdp.wipeDai(0.5);
    const wipeHandler = jest.fn((tx, state) => {
      expect(tx.metadata.method).toBe('safeWipe');
      expect(state).toBe(txStates[wipeHandler.mock.calls.length - 1]);
    });
    txMgr.listen(wipe, wipeHandler);
    await wipe;
    expect(wipeHandler.mock.calls.length).toBe(2);
    await expectValuesAfterReset(cdp, {
      debt: 1.5,
      myDai: startingDaiBalance.plus(1.5)
    });

    await cdp.wipeAndFree(MDAI(1), GEM(0.5));
    await expectValuesAfterReset(cdp, {
      collateral: 0.5,
      debt: 0.5,
      myDai: startingDaiBalance.plus(0.5),
      myGem: startingGemBalance.minus(0.5)
    });
  });

  test('openLockAndDraw, wipeAll, give', async () => {
    const txStates = ['pending', 'mined', 'confirmed'];
    const mgr = maker.service(CDP_MANAGER);
    const cdp = await mgr.openLockAndDraw(ilk, GEM(1), MDAI(1));
    await expectValuesAfterReset(cdp, {
      debt: 1,
      myDai: startingDaiBalance.plus(1)
    });

    const wipeAll = cdp.wipeAll();
    const wipeAllHandler = jest.fn((tx, state) => {
      expect(tx.metadata.method).toBe('safeWipeAll');
      expect(state).toBe(txStates[wipeAllHandler.mock.calls.length - 1]);
    });
    txMgr.listen(wipeAll, wipeAllHandler);
    await wipeAll;
    expect(wipeAllHandler.mock.calls.length).toBe(2);

    await expectValuesAfterReset(cdp, {
      debt: 0,
      myDai: startingDaiBalance
    });

    const newAddress = '0x81431b69b1e0e334d4161a13c2955e0f3599381e';
    const give = cdp.give(newAddress);
    const giveHandler = jest.fn((tx, state) => {
      expect(tx.metadata.method).toBe('give');
      expect(state).toBe(txStates[giveHandler.mock.calls.length - 1]);
    });
    txMgr.listen(give, giveHandler);
    await give;
    expect(giveHandler.mock.calls.length).toBe(2);

    const newOwner = await cdp.getOwner();
    expect(newOwner.toLowerCase()).toBe(newAddress);
  });

  test('openLockAndDraw, wipeAllAndFree, giveToProxy', async () => {
    const txStates = ['pending', 'mined', 'confirmed'];
    const mgr = maker.service(CDP_MANAGER);
    const cdp = await mgr.openLockAndDraw(ilk, GEM(1), MDAI(1));
    await expectValuesAfterReset(cdp, {
      collateral: 1,
      debt: 1,
      myDai: startingDaiBalance.plus(1),
      myGem: startingGemBalance.minus(1)
    });

    const wipeAllAndFree = cdp.wipeAllAndFree(GEM(1));
    const wipeAllAndFreeHandler = jest.fn((tx, state) => {
      expect(tx.metadata.method).toEqual(
        expect.stringContaining('wipeAllAndFree')
      );
      expect(state).toBe(txStates[wipeAllAndFreeHandler.mock.calls.length - 1]);
    });
    txMgr.listen(wipeAllAndFree, wipeAllAndFreeHandler);
    await wipeAllAndFree;
    expect(wipeAllAndFreeHandler.mock.calls.length).toBe(2);

    await expectValuesAfterReset(cdp, {
      collateral: 0,
      debt: 0,
      myDai: startingDaiBalance,
      myGem: startingGemBalance
    });

    const newAddress = '0x81431b69b1e0e334d4161a13c2955e0f3599381e';
    const giveToProxy = cdp.giveToProxy(newAddress);
    const giveToProxyHandler = jest.fn((tx, state) => {
      expect(tx.metadata.method).toBe('giveToProxy');
      expect(state).toBe(txStates[giveToProxyHandler.mock.calls.length - 1]);
    });
    txMgr.listen(giveToProxy, giveToProxyHandler);
    await giveToProxy;
    expect(giveToProxyHandler.mock.calls.length).toBe(2);

    const newCdpOwner = await cdp.getOwner();
    const newProxyOwner = await maker.service('proxy').getOwner(newCdpOwner);
    expect(newProxyOwner.toLowerCase()).toBe(newAddress);
  });

  test('openLockAndDraw, unsafeWipe', async () => {
    const txStates = ['pending', 'mined', 'confirmed'];
    const mgr = maker.service(CDP_MANAGER);
    const cdp = await mgr.openLockAndDraw(ilk, GEM(1), MDAI(1));

    const unsafeWipe = cdp.unsafeWipe(MDAI(1));
    const unsafeWipeHandler = jest.fn((tx, state) => {
      expect(tx.metadata.method).toEqual(expect.stringContaining('wipe'));
      expect(state).toBe(txStates[unsafeWipeHandler.mock.calls.length - 1]);
    });
    txMgr.listen(unsafeWipe, unsafeWipeHandler);
    await unsafeWipe;
    expect(unsafeWipeHandler.mock.calls.length).toBe(2);
  });

  test('openLockAndDraw, unsafeWipeAll', async () => {
    const txStates = ['pending', 'mined', 'confirmed'];
    const mgr = maker.service(CDP_MANAGER);
    const cdp = await mgr.openLockAndDraw(ilk, GEM(1), MDAI(1));

    const unsafeWipeAll = cdp.unsafeWipeAll();
    const unsafeWipeAllHandler = jest.fn((tx, state) => {
      expect(tx.metadata.method).toBe('wipeAll');
      expect(state).toBe(txStates[unsafeWipeAllHandler.mock.calls.length - 1]);
    });
    txMgr.listen(unsafeWipeAll, unsafeWipeAllHandler);
    await unsafeWipeAll;
    expect(unsafeWipeAllHandler.mock.calls.length).toBe(2);

    await expectValuesAfterReset(cdp, {
      debt: 0,
      myDai: startingDaiBalance
    });
  });
});
