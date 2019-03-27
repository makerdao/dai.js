import { mcdMaker } from '../helpers';
import { ServiceRoles } from '../../src/constants';
import { ETH, MDAI } from '../../src';
//import debug from 'debug';

const { CDP_MANAGER } = ServiceRoles;
//const log = debug('mcd:testing:integration');

let maker, dai, proxy;

beforeAll(async () => {
  if (!process.env.PRIVATE_KEY && process.env.NETWORK !== 'test') {
    throw new Error('Please set a private key to run integration tests.');
  }
  const settings =
    process.env.NETWORK === 'test' //the test settings could probably be deleted?
      ? {
          web3: {
            confirmedBlockCount: '0',
            pollingInterval: 50
          }
        }
      : {
          privateKey: process.env.PRIVATE_KEY,
          web3: {
            transactionSettings: {
              gasPrice: 15000000000
            }
          }
        };

  maker = await mcdMaker({
    preset: process.env.NETWORK,
    network: 'kovan',
    settings
  });

  await maker.authenticate();

  dai = maker.getToken(MDAI);
  proxy = await maker.currentProxy();

  /* const txMgr = maker.service('transactionManager');
  txMgr.onNewTransaction(txo => {
    const {
      metadata: { contract, method } = { contract: '???', method: '???' }
    } = txo;
    const label = `tx ${uniqueId(txo)}: ${contract}.${method}`;
    log(`${label}: new`);

    txo.onPending(() => log(`${label}: pending`));
    txo.onMined(() => log(`${label}: mined`));
    txo.onFinalized(() => log(`${label}: confirmed`));
  });*/
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

test('can create Maker instance', () => {
  expect(maker).toBeDefined();
});

const scenarios = [['ETH-A', ETH]];

describe.each(scenarios)('%s', (ilk, GEM) => {
  let startingGemBalance, startingDaiBalance;

  /*
  beforeEach(async () => {
    startingGemBalance = await maker.getToken(GEM).balance();
    startingDaiBalance = await dai.balance();
  });*/

  test(
    'open',
    async () => {
      const cdp = await maker.service(CDP_MANAGER).open(ilk);
      expect(cdp.id).toBeGreaterThan(0);
      await expectValues(cdp, { collateral: 0, debt: 0 });
    },
    30000
  );

  test(
    'openLock, lock, lockAndDraw, free',
    async () => {
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
    },
    180000
  );
});
