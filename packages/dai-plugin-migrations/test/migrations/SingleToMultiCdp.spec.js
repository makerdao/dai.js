import { migrationMaker } from '../helpers';
import { mockCdpIds } from '../helpers/mocks';
import { ServiceRoles, Migrations } from '../../src/constants';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { SAI, MKR } from '../../src/index';

let maker, migration, snapshotData;

async function drawSaiAndMigrateToDai(drawAmount) {
  const cdp = await maker.openCdp();
  await cdp.lockEth('20');
  await cdp.drawDai(drawAmount);
  const migrationContract = maker
    .service('smartContract')
    .getContract('MIGRATION');

  const sai = maker.getToken(SAI);
  await sai.approveUnlimited(migrationContract.address);
  await migrationContract.swapSaiToDai(SAI(10).toFixed('wei'));
}

async function openLockAndDrawScdCdp(drawAmount) {
  const proxy = await maker.service('proxy').currentProxy();
  const cdp = await maker.openCdp();
  await cdp.lockEth('20');
  await cdp.drawDai(drawAmount);
  await cdp.give(proxy);
  return cdp;
}

describe('SCD to MCD CDP Migration', () => {
  beforeAll(async () => {
    maker = await migrationMaker();
    const service = maker.service(ServiceRoles.MIGRATION);
    migration = service.getMigration(Migrations.SINGLE_TO_MULTI_CDP);
  });

  beforeEach(async () => {
    snapshotData = await takeSnapshot(maker);
  });

  afterEach(async () => {
    await restoreSnapshot(snapshotData, maker);
  });

  describe('checks', () => {
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
      await drawSaiAndMigrateToDai(10); // lock 10 sai into the mcd migration cdp
      const saiLiquidity = await migration.migrationSaiAvailable();
      expect(saiLiquidity.toFixed('wei')).toBe('9999999999999999999');
    });
  });

  describe('migrations', () => {
    let cdp, proxyAddress, migrationContract;

    beforeEach(async () => {
      migrationContract = maker
        .service('smartContract')
        .getContract('MIGRATION');
      proxyAddress = await maker.service('proxy').currentProxy();
      await openLockAndDrawScdCdp(100);
      cdp = await openLockAndDrawScdCdp(10);
      await maker.getToken(MKR).approveUnlimited(proxyAddress);
      await maker.getToken(SAI).approveUnlimited(migrationContract.address);
      await migrationContract.swapSaiToDai(SAI(50).toFixed('wei'));
    });

    test('migrate scd cdp to mcd, pay fee with mkr', async () => {
      expect.assertions(2);

      const mcdCdpsBeforeMigration = await maker
        .service('mcd:cdpManager')
        .getCdpIds(proxyAddress);
      await migration.execute(cdp.id);
      const newMaker = await migrationMaker();
      const mcdCdpsAfterMigration = await newMaker
        .service('mcd:cdpManager')
        .getCdpIds(proxyAddress);

      try {
        await maker.getCdp(cdp.id);
      } catch (err) {
        expect(err.message).toEqual(
          "That CDP doesn't exist--try opening a new one."
        );
      }
      expect(mcdCdpsAfterMigration.length).toEqual(
        mcdCdpsBeforeMigration.length + 1
      );
    });

    xtest('migrate scd cdp to mcd, pay fee with sai', async () => {
      // await migration.execute(cdp.id, 'GEM', 10);
    });

    xtest('migrate scd cdp to mcd, pay fee with debt', async () => {
      // await migration.execute(cdp.id, 'DEBT', 10);
    });
  });
});
