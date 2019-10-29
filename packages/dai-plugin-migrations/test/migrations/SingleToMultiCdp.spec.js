import { migrationMaker } from '../helpers';
import { ServiceRoles, Migrations } from '../../src/constants';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { SAI } from '../../src/index';

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
  const cdp = await maker.openCdp();
  await cdp.lockEth('20');
  await cdp.drawDai(drawAmount);
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

  test('if there is sai locked in the mcd migration cdp, return the amount that is there', async () => {
    const noSaiLiquidity = await migration.migrationSaiAvailable();
    expect(noSaiLiquidity.toNumber()).toBe(0);

    await openLockAndDrawScdCdp('10');
    const migrationContract = maker
      .service('smartContract')
      .getContract('MIGRATION');

    const sai = maker.getToken(SAI);
    await sai.approveUnlimited(migrationContract.address);
    await migrationContract.swapSaiToDai(SAI(10).toFixed('wei'));

    const someSaiLiquidity = await migration.migrationSaiAvailable();
    expect(someSaiLiquidity.toNumber()).toBe(10);
  });
});
