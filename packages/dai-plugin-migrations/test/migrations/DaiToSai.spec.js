import { migrationMaker, drawSaiAndMigrateToDai } from '../helpers';
import { ServiceRoles, Migrations } from '../../src/constants';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { ETH } from '@makerdao/dai-plugin-mcd/dist';

let maker, migration, snapshot;

describe('DAI to SAI Migration', () => {
  beforeAll(async () => {
    maker = await migrationMaker();
    const service = maker.service(ServiceRoles.MIGRATION);
    migration = service.getMigration(Migrations.DAI_TO_SAI);
    snapshot = await takeSnapshot(maker);
  });

  afterAll(async () => {
    restoreSnapshot(snapshot, maker);
  });

  test('if the account has no DAI, return 0', async () => {
    const amount = await maker
      .service('token')
      .getToken('DAI')
      .balance();
    expect(amount.toNumber()).toBe(0);

    expect((await migration.check()).eq(0)).toBeTruthy();
  });

  test('if the account has some DAI, return the balance', async () => {
    await maker.service('mcd:cdpManager').openLockAndDraw('ETH-A', ETH(5), 100);

    const amount = await maker
      .service('token')
      .getToken('DAI')
      .balance();
    expect(amount.toNumber()).toBe(100);

    expect((await migration.check()).eq(100)).toBeTruthy();
  });

  xtest('execute migrates DAI to SAI', async () => {
    await drawSaiAndMigrateToDai(10, maker);
    const address = maker.service('web3').currentAddress();
    await maker.service('mcd:cdpManager').openLockAndDraw('ETH-A', ETH(5), 100);
    const daiBalanceBeforeMigration = await migration._dai.balanceOf(address);
    const saiBalanceBeforeMigration = await maker
      .service('token')
      .getToken('SAI')
      .balanceOf(address);

    await migration.execute(100);

    const daiBalanceAfterMigration = await migration._dai.balanceOf(address);
    const saiBalanceAfterMigration = await maker
      .service('token')
      .getToken('SAI')
      .balanceOf(address);

    expect(saiBalanceBeforeMigration.toNumber()).toEqual(
      saiBalanceAfterMigration.toNumber() - 100
    );
    expect(daiBalanceBeforeMigration.toNumber()).toEqual(
      daiBalanceAfterMigration.toNumber() + 100
    );
  });
});
