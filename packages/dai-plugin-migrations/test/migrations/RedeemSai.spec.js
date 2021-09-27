import { migrationMaker, shutDown } from '../helpers';
import { ServiceRoles, Migrations } from '../../src/constants';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { ETH } from '@makerdao/dai';

let maker, migration, snapshotData;
jest.setTimeout(30000);

describe('Redeem Sai', () => {
  beforeAll(async () => {
    maker = await migrationMaker();
    snapshotData = await takeSnapshot(maker);
    const service = maker.service(ServiceRoles.MIGRATION);
    migration = service.getMigration(Migrations.REDEEM_SAI);
    await shutDown();
  }, 30000);

  afterAll(async () => {
    await restoreSnapshot(snapshotData, maker);
  }, 30000);

  test('should be off after shutdown', async () => {
    const off = await migration.off();
    expect(off).toBe(true);
  }, 30000);

  test('should get the exchange rate', async () => {
    const rate = await migration.getRate();
    expect(rate).toBe(0.0025);
  }, 30000);

  test('should redeem sai', async () => {
    const sai = maker.getToken('SAI');
    const web3Service = maker.service('web3');
    const address = web3Service.currentAddress();
    const cageFree = maker.service('smartContract').getContract('SAI_CAGEFREE')
      .address;
    await sai.approveUnlimited(cageFree);
    const saiBalanceBeforeRedemption = await sai.balanceOf(address);
    const ethBalanceBeforeRedemption = ETH.wei(
      await web3Service.getBalance(address)
    );
    await migration.redeemSai(5);
    const saiBalanceAfterRedemption = await sai.balanceOf(address);
    const ethBalanceAfterRedemption = ETH.wei(
      await web3Service.getBalance(address)
    );

    expect(saiBalanceAfterRedemption).toEqual(
      saiBalanceBeforeRedemption.minus(5)
    );
    expect(ethBalanceAfterRedemption.toNumber()).toBeGreaterThan(
      ethBalanceBeforeRedemption.toNumber()
    );
  }, 30000);
});
