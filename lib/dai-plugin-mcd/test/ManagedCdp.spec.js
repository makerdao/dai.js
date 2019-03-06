import Maker from '@makerdao/dai';
import { mcdMaker, setupCollateral, setDebtCeiling } from './helpers';
import { REP, MDAI } from '../src';
import { ServiceRoles } from '../src/constants';

// FIXME we won't be able to reach into @makerdao/dai internals like this when
// this plugin is moved into its own module...
import TestAccountProvider from '../../../test/helpers/TestAccountProvider';

const { ETH } = Maker;
const { CDP_MANAGER } = ServiceRoles;

let maker, dai, proxy;

beforeAll(async () => {
  maker = await mcdMaker();
  dai = maker.getToken(MDAI);
  await setDebtCeiling(maker, MDAI(100));
  // the current account has a proxy only because the testchain setup script
  // creates it -- this is probably not a future-proof assumption
  proxy = await maker.currentProxy();
});

test('prevent locking the wrong collateral type', async () => {
  const cdp = await maker.service(CDP_MANAGER).open('DGX');
  expect.assertions(1);
  try {
    await cdp.lockCollateral(REP(1));
  } catch (err) {
    expect(err.message).toMatch(/Can't cast 1.00 REP as DGX/);
  }
});

test('prevent freeing the wrong collateral type', async () => {
  const cdp = await maker.service(CDP_MANAGER).open('DGX');
  expect.assertions(1);
  try {
    await cdp.freeCollateral(REP(1));
  } catch (err) {
    expect(err.message).toMatch(/Can't cast 1.00 REP as DGX/);
  }
});

async function expectValues(cdp, { collateral, debt, myGem, myDai }) {
  if (collateral !== undefined) {
    expect(await cdp.getCollateralValue()).toEqual(cdp.currency(collateral));
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

describe.each([
  [
    'ETH',
    ETH,
    async () => setupCollateral(maker, 'ETH', { price: 150, debtCeiling: 50 })
  ],
  [
    'REP',
    REP,
    async () =>
      setupCollateral(maker, 'REP', { mint: 10, price: 100, debtCeiling: 50 })
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
    const mgr = maker.service(CDP_MANAGER);
    const cdp = await mgr.openLockAndDraw(ilk, GEM(1), MDAI(1));
    await expectValues(cdp, {
      collateral: 1,
      debt: 1,
      myDai: startingDaiBalance.plus(1),
      myGem: startingGemBalance.minus(1)
    });

    const sameCdp = mgr.getCdp(cdp.id, ilk);
    await expectValues(sameCdp, { collateral: 1, debt: 1 });

    await cdp.drawDai(1);
    await expectValues(cdp, { debt: 2, myDai: startingDaiBalance.plus(2) });

    await cdp.wipeDai(0.5);
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

describe('another account', () => {
  let mgr, cdpId;

  beforeAll(async () => {
    const account2 = TestAccountProvider.nextAccount();
    await maker.addAccount({ ...account2, type: 'privateKey' });
    maker.useAccount(account2.address);
    mgr = maker.service(CDP_MANAGER);
  });

  afterAll(() => {
    maker.useAccount('default');
  });

  test('create proxy during open', async () => {
    expect(await maker.currentProxy()).toBeFalsy();
    const cdp = await mgr.openLockAndDraw('ETH', ETH(2));
    expect(cdp.id).toBeGreaterThan(0);
    cdpId = cdp.id;
    expect(await maker.currentProxy()).toBeTruthy();
  });

  test("prevent access to a CDP you don't own", async () => {
    maker.useAccount('default');
    const cdp = mgr.getCdp(cdpId, 'ETH');
    expect.assertions(1);
    try {
      await cdp.freeCollateral(ETH(1));
    } catch (err) {
      expect(err.message).toMatch(/revert/);
    }
  });
});
