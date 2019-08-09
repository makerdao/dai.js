import { migrationMaker } from '../helpers';
import { ServiceRoles, Migrations } from '../../src/constants';

let address, maker, migration, mkr, oldMkr;

describe('MKR migration check', () => {
  beforeAll(async () => {
    maker = await migrationMaker();
    address = maker.service('web3').currentAddress();
    migration = maker
      .service(ServiceRoles.MIGRATION)
      .getMigration(Migrations.MKR_REDEEMER);
    mkr = maker.getToken('MKR');
    oldMkr = maker.getToken('OLD_MKR');

    await oldMkr.approveUnlimited(address);
    await mkr.approveUnlimited(address);
  });

  test('if the account has no old MKR, return false', async () => {
    await addFreshAccount();
    maker.service('accounts').useAccount('newAccount');
    const amount = await migration.oldMkrBalance();

    expect(amount.toNumber()).toBe(0);
    expect(await migration.check()).toBeFalsy();

    maker.service('accounts').useAccount('default');
  });

  test('if the account has old MKR, return true', async () => {
    const amount = await migration.oldMkrBalance();

    expect(amount.toNumber()).toBe(400);
    expect(await migration.check()).toBeTruthy();
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
