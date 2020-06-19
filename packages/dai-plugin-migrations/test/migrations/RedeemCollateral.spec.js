import { migrationMaker, shutDown } from '../helpers';
import { ServiceRoles, Migrations } from '../../src/constants';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';

let maker, migration, snapshotData;

describe('Redeem collateral', () => {
  beforeAll(async () => {
    jest.setTimeout(30000);

    maker = await migrationMaker();
    snapshotData = await takeSnapshot(maker);
    const service = maker.service(ServiceRoles.MIGRATION);
    migration = service.getMigration(Migrations.REDEEM_COLLATERAL);
    await shutDown();
    await migration._contract('SAI_TOP').setCooldown(0);
  });

  afterAll(async () => {
    await restoreSnapshot(snapshotData, maker);
  });

  test('should get the remaining cooldown', async () => {
    const cooldown = await migration.cooldown();
    expect(cooldown.toNumber()).toBe(0);
  });

  test('should get the total peth in tap', async () => {
    expect(await migration.pethInTap()).toBe(0.535);
  });

  test('should redeem collateral', async () => {
    const cdp = await maker.service('cdp').getCdp(1);
    const peth = maker.getToken('PETH');
    const address = maker.service('web3').currentAddress();
    const collateral = await cdp.getCollateralValue();
    await migration.redeemCollateral(cdp, collateral);
    const pethBalance = await peth.balanceOf(address);
    expect(pethBalance.toNumber()).toBe(collateral.toNumber());
  });
});
