import { migrationMaker } from '../helpers';
import { ServiceRoles, Migrations } from '../../src/constants';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { SAI, MKR } from '../../src/index';

let maker, migration, snapshotData;

async function mockCdpIds({ forAccount, forProxy } = {}) {
  const currentAddress = maker.currentAddress();
  const currentProxy = await maker.currentProxy();

  maker.service('cdp').getCdpIds = jest.fn().mockImplementation(addr => {
    if (addr === currentAddress) {
      return forAccount || [];
    } else if (addr === currentProxy) {
      return forProxy || [];
    } else {
      return [];
    }
  });
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

  test('if there are no cdps, return false', async () => {
    await mockCdpIds();

    expect(await migration.check()).toBeFalsy();
  });

  test('if there are cdps owned by a proxy, but no cdps owned by the account, return true', async () => {
    await mockCdpIds({ forProxy: [{ id: '123' }] });

    expect(await migration.check()).toBeTruthy();
  });

  test('if there are cdps owned by the account, but no cdps owned by a proxy, return true', async () => {
    await mockCdpIds({ forAccount: [{ id: '123' }] });

    expect(await migration.check()).toBeTruthy();
  });

  test('if there are both cdps owned by the account and proxy, return true', async () => {
    await mockCdpIds({
      forAccount: [{ id: '123' }],
      forProxy: [{ id: '234' }]
    });

    expect(await migration.check()).toBeTruthy();
  });

  test('migrate scd cdp to mcd, pay fee with mkr', async () => {
    expect.assertions(3);
    const migrationContract = maker
      .service('smartContract')
      .getContract('MIGRATION');
    const proxyAddress = await maker.service('proxy').currentProxy();

    await openLockAndDrawScdCdp(100);
    const cdp2 = await openLockAndDrawScdCdp(10);
    expect(cdp2.id).toBeDefined();

    const sai = maker.getToken(SAI);
    const mkr = maker.getToken(MKR);
    await mkr.approveUnlimited(proxyAddress);
    await sai.approveUnlimited(migrationContract.address);

    await migrationContract.swapSaiToDai(SAI(50).toFixed('wei'));

    const mcdCdpsBeforeMigration = await maker.service('mcd:cdpManager').getCdpIds(proxyAddress);
    await migration.execute(cdp2.id);
    const newMaker = await migrationMaker();
    const mcdCdpsAfterMigration = await newMaker.service('mcd:cdpManager').getCdpIds(proxyAddress);

    try {
      await maker.getCdp(cdp2.id);
    } catch (err) {
      expect(err.message).toEqual('That CDP doesn\'t exist--try opening a new one.');
    }
    expect(mcdCdpsAfterMigration.length).toEqual(mcdCdpsBeforeMigration.length + 1);
  });
  
  xtest('migrate scd cdp to mcd, pay fee with sai', async () => {
    // await migration.execute(cdp2.id, 'GEM', 10);
  });
  
  xtest('migrate scd cdp to mcd, pay fee with debt', async () => {
    // await migration.execute(cdp2.id, 'DEBT', 10);
  });
});
