import {
  migrationMaker,
  placeLimitOrder,
  setPrice,
  drawSaiAndMigrateToDai,
  migrateSaiToDai
} from '../helpers';
import { mockCdpIds } from '../helpers/mocks';
import { ServiceRoles, Migrations } from '../../src/constants';
import {
  mineBlocks,
  takeSnapshot,
  restoreSnapshot
} from '@makerdao/test-helpers';
import { USD, MDAI as DAI, ETH } from '@makerdao/dai-plugin-mcd';
import { SAI, MKR } from '../../src';
import { createCurrencyRatio } from '@makerdao/currency';

let maker, migration, snapshotData;

async function openLockAndDrawScdCdp(drawAmount) {
  const proxy = await maker.service('proxy').currentProxy();
  const cdp = await maker.openCdp();
  await cdp.lockEth('20');
  await cdp.drawDai(drawAmount);
  await cdp.give(proxy);
  return cdp;
}

describe('SCD to MCD CDP Migration', () => {
  beforeEach(async () => {
    maker = await migrationMaker();
    const service = maker.service(ServiceRoles.MIGRATION);
    migration = service.getMigration(Migrations.SINGLE_TO_MULTI_CDP);
  });

  describe('checks', () => {
    beforeEach(async () => {
      snapshotData = await takeSnapshot(maker);
    });

    afterEach(async () => {
      await restoreSnapshot(snapshotData, maker);
    });

    test('if there are no cdps, return false', async () => {
      await mockCdpIds(maker);

      expect(await migration.check()).toMatchObject({});
    });

    test('if there are cdps owned by a proxy, but no cdps owned by the account, return true', async () => {
      await mockCdpIds(maker, { forProxy: [{ id: '123' }] });
      expect(await migration.check()).toMatchObject({
        [await maker.currentProxy()]: [{ id: '123' }],
        [maker.currentAddress()]: []
      });
    });

    test('if there are cdps owned by the account, but no cdps owned by a proxy, return true', async () => {
      await mockCdpIds(maker, { forAccount: [{ id: '123' }] });
      expect(await migration.check()).toMatchObject({
        [await maker.currentProxy()]: [],
        [maker.currentAddress()]: [{ id: '123' }]
      });
    });

    test('if there are both cdps owned by the account and proxy, return true', async () => {
      await mockCdpIds(maker, {
        forAccount: [{ id: '123' }],
        forProxy: [{ id: '234' }]
      });
      expect(await migration.check()).toMatchObject({
        [await maker.currentProxy()]: [{ id: '234' }],
        [maker.currentAddress()]: [{ id: '123' }]
      });
    });

    test('if there is no sai locked in the mcd migration cdp, return 0', async () => {
      const saiLiquidity = await migration.migrationSaiAvailable();
      expect(saiLiquidity.toFixed('wei')).toBe('0');
    });

    test('if there is sai locked in the mcd migration cdp, return the amount that is there', async () => {
      await drawSaiAndMigrateToDai(10, maker); // lock 10 sai into the migration cdp
      const available = await migration.migrationSaiAvailable();
      expect(available.toFixed('wei')).toBe('9999999999999999999');
    });

    test('if the headroom under the debt ceiling is smaller than the sai locked, return that amount', async () => {
      await drawSaiAndMigrateToDai(1000, maker);
      await setPrice(maker, createCurrencyRatio(USD, ETH)(100000), 'ETH-A');

      // this expects the debt ceiling to be 100000
      await maker
        .service('mcd:cdpManager')
        .openLockAndDraw('ETH-A', ETH(2), DAI(99998));

      const available = await migration.migrationSaiAvailable();
      expect(available.toFixed('wei')).toBe('1999999999999999999');
    });

    test('saiAmountNeededToBuyMkr', async () => {
      await placeLimitOrder(migration._manager);
      const saiAmount = await migration.saiAmountNeededToBuyMkr(MKR(0.5));
      expect(saiAmount).toEqual(SAI(10));
    });
  });

  describe.each(['MKR', 'DEBT', 'GEM'])('pay with %s', payment => {
    let cdp, proxyAddress;

    beforeEach(async () => {
      jest.setTimeout(20000);
      snapshotData = await takeSnapshot(maker);
      proxyAddress = await maker.service('proxy').currentProxy();
      await openLockAndDrawScdCdp(100);
      cdp = await openLockAndDrawScdCdp(10);
      await migrateSaiToDai(50, maker);
    });

    afterEach(async () => {
      await restoreSnapshot(snapshotData, maker);
    });

    test('execute', async () => {
      let maxPayAmount, minRatio;

      if (payment !== 'MKR') {
        await placeLimitOrder(migration._manager);
        maxPayAmount = 10;
      }
      if (payment === 'DEBT') minRatio = 150;
      await maker.service('price').setMkrPrice(100);

      const manager = maker.service('mcd:cdpManager');
      const scdCollateral = await cdp.getCollateralValue();
      const scdDebt = await cdp.getDebtValue();
      await mineBlocks(maker.service('web3'), 3);
      await maker
        .service('smartContract')
        .getContract('MCD_POT')
        .drip();

      const mcdCdpsBeforeMigration = await manager.getCdpIds(proxyAddress);

      const newId = await migration.execute(
        cdp.id,
        payment,
        maxPayAmount,
        minRatio
      );
      await manager.reset();

      const mcdCdpsAfterMigration = await manager.getCdpIds(proxyAddress);
      const mcdCdpId = mcdCdpsAfterMigration[0].id;
      expect(newId).toEqual(mcdCdpId);

      maker.service('mcd:cdpType').reset();
      const mcdCdp = await manager.getCdp(mcdCdpId);
      const mcdCollateral = mcdCdp.collateralAmount.toNumber();
      const mcdDebt = mcdCdp.debtValue.toNumber();

      expect(mcdCollateral).toEqual(scdCollateral.toNumber());
      expect(mcdDebt).toBeCloseTo(scdDebt.toNumber(), 1);

      let message;
      try {
        await maker.getCdp(cdp.id);
      } catch (err) {
        message = err.message;
      }

      expect(message).toEqual("That CDP doesn't exist--try opening a new one.");

      expect(mcdCdpsAfterMigration.length).toEqual(
        mcdCdpsBeforeMigration.length + 1
      );
    });
  });
});
