import { mcdMaker } from '../helpers';
import { ServiceRoles } from '../../src/constants';
import { ETH, MDAI } from '../../src';
import { uniqueId } from '../../src/utils/index';
import debug from 'debug';
import { infuraProjectId } from './index';

const { CDP_MANAGER } = ServiceRoles;
const log = debug('mcd:testing:integration');

let maker, dai, proxy, txMgr;

beforeAll(async () => {
  if (!process.env.PRIVATE_KEY && process.env.NETWORK !== 'test') {
    throw new Error('Please set a private key to run integration tests.');
  }
  const settings = {
    privateKey: process.env.PRIVATE_KEY,
    web3: {
      transactionSettings: {
        gasPrice: 15000000000
      },
      provider: {
        infuraProjectId
      }
    }
  };
  const network =
    process.env.NETWORK === 'test' ? 'testnet' : process.env.NETWORK;
  maker = await mcdMaker({
    preset: process.env.NETWORK,
    network: network,
    ...settings
  });

  await maker.authenticate();

  dai = maker.getToken(MDAI);
  proxy = await maker.currentProxy();

  txMgr = maker.service('transactionManager');
  txMgr.onNewTransaction(txo => {
    const {
      metadata: { contract, method } = { contract: '???', method: '???' }
    } = txo;
    const label = `tx ${uniqueId(txo)}: ${contract}.${method}`;
    log(`${label}: new`);

    txo.onPending(() => log(`${label}: pending`));
    txo.onMined(() => log(`${label}: mined`));
    txo.onFinalized(() => log(`${label}: confirmed`));
  });
});

//same as the expectValues function in ManagedCdp.spec.js
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

test('can create Maker instance', () => {
  expect(maker).toBeDefined();
});

const scenarios = [['ETH-A', ETH]];

describe.each(scenarios)('%s', (ilk, GEM) => {
  let startingGemBalance, startingDaiBalance;

  test('open', async () => {
    const cdp = await maker.service(CDP_MANAGER).open(ilk);
    expect(cdp.id).toBeGreaterThan(0);
    await expectValues(cdp, { collateral: 0, debt: 0 });
  }, 30000);

  test('openLock, lock, lockAndDraw, free', async () => {
    startingGemBalance = await maker.getToken(GEM).balance();
    startingDaiBalance = await dai.balance();
    await dai.approveUnlimited(proxy);
    const cdp = await maker
      .service(CDP_MANAGER)
      .openLockAndDraw(ilk, GEM(0.01));
    await expectValues(cdp, {
      collateral: 0.01,
      debt: 0,
      myGem: startingGemBalance.minus(0.01)
    });

    await cdp.lockCollateral(0.01);
    await expectValues(cdp, {
      collateral: 0.02,
      myGem: startingGemBalance.minus(0.02)
    });

    await cdp.lockAndDraw(0.01, 0.5);
    await expectValues(cdp, {
      collateral: 0.03,
      debt: 0.5,
      myDai: startingDaiBalance.plus(0.5),
      myGem: startingGemBalance.minus(0.03)
    });

    await cdp.freeCollateral(0.008);
    await expectValues(cdp, {
      collateral: 0.022,
      myGem: startingGemBalance.minus(0.022)
    });
  }, 180000);

  test('openLockAndDraw, get, draw, wipe, wipeAndFree', async () => {
    const txStates = ['pending', 'mined', 'confirmed'];
    const mgr = maker.service(CDP_MANAGER);
    startingGemBalance = await maker.getToken(GEM).balance();
    startingDaiBalance = await dai.balance();
    await dai.approveUnlimited(proxy);
    const cdp = await mgr.openLockAndDraw(ilk, GEM(0.01), MDAI(0.1));
    await expectValues(cdp, {
      collateral: 0.01,
      debt: 0.1,
      myDai: startingDaiBalance.plus(0.1),
      myGem: startingGemBalance.minus(0.01)
    });

    const sameCdp = await mgr.getCdp(cdp.id);
    await expectValues(sameCdp, { collateral: 0.01, debt: 0.1 });

    const draw = cdp.drawDai(0.1);
    const drawHandler = jest.fn((tx, state) => {
      expect(tx.metadata.method).toBe(
        `lock${GEM == ETH ? 'ETH' : 'Gem'}AndDraw`
      );
      expect(state).toBe(txStates[drawHandler.mock.calls.length - 1]);
    });
    txMgr.listen(draw, drawHandler);
    await draw;
    expect(drawHandler.mock.calls.length).toBe(2);
    await expectValues(cdp, {
      debt: 0.2,
      myDai: startingDaiBalance.plus(0.2)
    });

    const wipe = cdp.wipeDai(0.05);
    const wipeHandler = jest.fn((tx, state) => {
      expect(tx.metadata.method).toBe(
        `wipeAndFree${GEM == ETH ? 'ETH' : 'Gem'}`
      );
      expect(state).toBe(txStates[wipeHandler.mock.calls.length - 1]);
    });
    txMgr.listen(wipe, wipeHandler);
    await wipe;
    expect(wipeHandler.mock.calls.length).toBe(2);
    await expectValues(cdp, {
      debt: 0.15,
      myDai: startingDaiBalance.plus(0.15)
    });

    await cdp.wipeAndFree(MDAI(0.1), GEM(0.005));
    await expectValues(cdp, {
      collateral: 0.005,
      debt: 0.05,
      myDai: startingDaiBalance.plus(0.05),
      myGem: startingGemBalance.minus(0.005)
    });
  }, 210000);
});
