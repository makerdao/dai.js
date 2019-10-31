import { migrationMaker } from '../helpers';
import { ServiceRoles, Migrations } from '../../src/constants';

let maker, migration;

describe('SDai to MDai Migration', () => {
  beforeAll(async () => {
    maker = await migrationMaker();
    const service = maker.service(ServiceRoles.MIGRATION);
    migration = service.getMigration(Migrations.SDAI_TO_MDAI);
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
});
