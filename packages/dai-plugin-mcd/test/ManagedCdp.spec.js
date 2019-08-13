import {
  mcdMaker,
  setupCollateral,
  takeSnapshot,
  restoreSnapshot
} from './helpers';
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

test('getLiquidationPrice and getCollateralizationRatio returns infinity with 0 collateral and 0 debt', async () => {
  const cdp = await maker.service(CDP_MANAGER).open('REP-A');
  const [price, collateralization] = await Promise.all([
    cdp.getLiquidationPrice(),
    cdp.getCollateralizationRatio()
  ]);
  const ratio = createCurrencyRatio(USD, REP);
  expect(price).toEqual(ratio(Infinity));
  expect(collateralization).toBe(Infinity);
});

async function expectValues(cdp, { collateral, debt, myGem, myDai }) {
  cdp.reset();
  if (collateral !== undefined) {
    expect(await cdp.getCollateralAmount()).toEqual(cdp.currency(collateral));
  }
  if (debt !== undefined) {
    expect((await cdp.getDebtValue()).toNumber()).toBeCloseTo(MDAI(debt).toNumber());
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
    expect(await dai.balance()).toEqual(myDai);
  }
}

async function expectUtilValues(cdp, { val, ratio, isSafe, dai }) {
  const [
    debtValue,
    collateralValue,
    collateralAmount,
    collateralizationRatio,
    safe,
    minCollateral,
    availCollateral,
    daiAvailable,
    liquidationRatio
  ] = await Promise.all([
    cdp.getDebtValue(),
    cdp.getCollateralValue(),
    cdp.getCollateralAmount(),
    cdp.getCollateralizationRatio(),
    cdp.isSafe(),
    cdp.getMinSafeCollateralAmount(),
    cdp.getCollateralAvailable(),
    cdp.getDaiAvailable(),
    cdp.type.getLiquidationRatio()
  ]);
  const minVal = debtValue.times(liquidationRatio).div(val);

  if (val !== undefined) {
    expect(collateralValue.toNumber()).toBe(val);
    expect(minCollateral.toNumber()).toBe(minVal.toNumber());
    expect(availCollateral.toNumber()).toBe(
      collateralAmount.minus(minVal.toNumber()).toNumber()
    );
  }
  if (ratio !== undefined) {
    expect(collateralizationRatio.toNumber()).toBe(ratio);
  }
  if (safe !== undefined) {
    expect(safe).toBe(isSafe);
  }
  if (dai !== undefined) {
    daiAvailable.eq(MDAI(dai));
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

  test('openLock, lock, lockAndDraw, free', async () => {
    const cdp = await maker.service(CDP_MANAGER).openLockAndDraw(ilk, GEM(1));
    await expectValues(cdp, {
      collateral: 1,
      debt: 0,
      myGem: startingGemBalance.minus(1)
    });

    await cdp.lockCollateral(1);
    await expectValues(cdp, {
      collateral: 2,
      myGem: startingGemBalance.minus(2)
    });

    await cdp.lockAndDraw(1, 5);
    await expectValues(cdp, {
      collateral: 3,
      debt: 5,
      myDai: startingDaiBalance.plus(5),
      myGem: startingGemBalance.minus(3)
    });

    await cdp.freeCollateral(0.8);
    await expectValues(cdp, {
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
    const price = await cdp.type.getPrice();
    await expectUtilValues(cdp, {
      val: price.toNumber(),
      ratio: price.toNumber(),
      isSafe: true,
      dai: '149'
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
    await expectValues(cdp, { debt: 2, myDai: startingDaiBalance.plus(2) });

    const wipe = cdp.wipeDai(0.5);
    const wipeHandler = jest.fn((tx, state) => {
      expect(tx.metadata.method).toBe('wipe');
      expect(state).toBe(txStates[wipeHandler.mock.calls.length - 1]);
    });
    txMgr.listen(wipe, wipeHandler);
    await wipe;
    expect(wipeHandler.mock.calls.length).toBe(2);
    await expectValues(cdp, { debt: 1.5, myDai: startingDaiBalance.plus(1.5) });

    await cdp.wipeAndFree(MDAI(1), GEM(0.5));
    await expectValues(cdp, {
      collateral: 0.5,
      debt: 0.5,
      myDai: startingDaiBalance.plus(0.5),
      myGem: startingGemBalance.minus(0.5)
    });
  });
});
