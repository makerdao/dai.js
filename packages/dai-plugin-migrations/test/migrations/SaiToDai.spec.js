import { migrationMaker } from '../helpers';
import { ServiceRoles, Migrations } from '../../src/constants';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';

let maker, migration, snapshot;

describe('SDai to MDai Migration', () => {
  beforeAll(async () => {
    maker = await migrationMaker();
    const service = maker.service(ServiceRoles.MIGRATION);
    migration = service.getMigration(Migrations.SAI_TO_DAI);
    snapshot = await takeSnapshot(maker);
  });

  afterAll(async () => {
    restoreSnapshot(snapshot, maker);
  });

  test('if the account has no SDAI, return 0', async () => {
    const amount = await maker
      .service('token')
      .getToken('DAI')
      .balance();
    expect(amount.toNumber()).toBe(0);

    expect((await migration.check()).eq(0)).toBeTruthy();
  });

  test('if the account has some SDAI, return the balance', async () => {
    const proxy = await maker.service('proxy').ensureProxy();
    await maker.service('cdp').openProxyCdpLockEthAndDrawDai(0.1, 1, proxy);

    const amount = await maker
      .service('token')
      .getToken('DAI')
      .balance();
    expect(amount.toNumber()).toBe(1);

    expect((await migration.check()).eq(1)).toBeTruthy();
  });

  test.only('execute migrates sai to dai', async () => {
    const address = maker.service('web3').currentAddress();
    const proxy = await maker.service('proxy').ensureProxy();
    await maker.service('cdp').openProxyCdpLockEthAndDrawDai(0.1, 1, proxy);
    const saiBalanceBeforeMigration = await migration._sai.balanceOf(address);
    const daiBalanceBeforeMigration = await maker
      .service('token')
      .getToken('MDAI')
      .balanceOf(address);

    await migration.execute(1);

    const saiBalanceAfterMigration = await migration._sai.balanceOf(address);
    const daiBalanceAfterMigration = await maker
      .service('token')
      .getToken('MDAI')
      .balanceOf(address);

    expect(saiBalanceBeforeMigration.toNumber()).toEqual(
      saiBalanceAfterMigration.toNumber() + 1
    );
    expect(daiBalanceBeforeMigration.toNumber()).toEqual(
      daiBalanceAfterMigration.toNumber() - 1
    );
  });
});
