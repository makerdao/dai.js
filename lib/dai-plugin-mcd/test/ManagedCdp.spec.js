import { mcdMaker, setupCollateral, setDebtCeiling } from './helpers';
import { ETH, COL1, MDAI } from '../src';
import { ServiceRoles } from '../src/constants';

const { CDP_MANAGER } = ServiceRoles;

let maker, dai, proxy, txMgr;

beforeAll(async () => {
  maker = await mcdMaker();
  dai = maker.getToken(MDAI);
  await setDebtCeiling(maker, MDAI(100));
  // the current account has a proxy only because the testchain setup script
  // creates it -- this is probably not a future-proof assumption
  proxy = await maker.currentProxy();
  txMgr = maker.service('transactionManager');
});

test('prevent locking the wrong collateral type', async () => {
  const cdp = await maker.service(CDP_MANAGER).open('COL1-A');
  expect.assertions(1);
  try {
    await cdp.lockCollateral(ETH(1));
  } catch (err) {
    expect(err.message).toMatch(/Can't cast 1.00 ETH as COL1/);
  }
});

test('prevent freeing the wrong collateral type', async () => {
  const cdp = await maker.service(CDP_MANAGER).open('COL1-A');
  expect.assertions(1);
  try {
    await cdp.freeCollateral(ETH(1));
  } catch (err) {
    expect(err.message).toMatch(/Can't cast 1.00 ETH as COL1/);
  }
});

async function expectValues(cdp, { collateral, debt, myGem, myDai }) {
  cdp.reset();
  if (collateral !== undefined) {
    expect(await cdp.getCollateralAmount()).toEqual(cdp.currency(collateral));
  }
  if (debt !== undefined) {
    expect(await cdp.getDebtValue()).toEqual(MDAI(debt));
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
    daiAvailable
  ] = await Promise.all([
    cdp.getDebtValue(),
    cdp.getCollateralValue(),
    cdp.getCollateralAmount(),
    cdp.getCollateralizationRatio(),
    cdp.isSafe(),
    cdp.minCollateral(),
    cdp.getCollateralAvailable(),
    cdp.getDaiAvailable()
  ]);

  const minVal = debtValue.div(val);

  if (val !== undefined) {
    expect(collateralValue.eq(val)).toBeTruthy();
    expect(minCollateral.toNumber()).toBe(minVal.toNumber());
    expect(availCollateral.toNumber()).toBe(
      collateralAmount.minus(minVal.toNumber()).toNumber()
    );
  }
  if (ratio !== undefined) {
    expect(collateralizationRatio.eq(ratio)).toBeTruthy();
  }
  if (safe !== undefined) {
    expect(safe).toBe(isSafe);
  }
  if (dai !== undefined) {
    daiAvailable.eq(MDAI(dai));
  }
}

describe.each([
  [
    'ETH-A',
    ETH,
    async () => setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 })
  ],
  [
    'COL1-A',
    COL1,
    async () =>
      setupCollateral(maker, 'COL1-A', { price: 100, debtCeiling: 50 })
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
      expect(tx.metadata.method).toBe(
        `wipeAndFree${GEM == ETH ? 'ETH' : 'Gem'}`
      );
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
