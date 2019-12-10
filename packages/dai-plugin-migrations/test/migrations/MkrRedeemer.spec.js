import { migrationMaker } from '../helpers';
import { ServiceRoles, Migrations } from '../../src/constants';
import { OLD_MKR } from '../../src';

let maker, migration;

describe('MKR migration check', () => {
  beforeAll(async () => {
    maker = await migrationMaker();
    migration = maker
      .service(ServiceRoles.MIGRATION)
      .getMigration(Migrations.MKR_REDEEMER);
  });

  test('if the account has no old MKR, return zero', async () => {
    await addFreshAccount();
    maker.service('accounts').useAccount('newAccount');
    expect(await migration.check()).toEqual(OLD_MKR(0));
    maker.service('accounts').useAccount('default');
  });

  test('if the account has old MKR, return balance', async () => {
    const amount = await migration.check();
    expect(amount).toEqual(OLD_MKR(400));
  });
});

async function addFreshAccount() {
  const newKey =
    'b3ae65f191aac33f3e3f662b8411cabf14f91f2b48cf338151d6021ea1c08541';
  await maker.service('accounts').addAccount('newAccount', {
    type: 'privateKey',
    key: newKey
  });
}
