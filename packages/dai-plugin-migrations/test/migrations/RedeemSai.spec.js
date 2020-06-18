import { migrationMaker, shutDown } from '../helpers';
import { ServiceRoles, Migrations } from '../../src/constants';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { ETH } from '@makerdao/dai';

let maker, migration, snapshotData;

describe('Redeem Sai', () => {
  beforeAll(async () => {
    jest.setTimeout(30000);

    maker = await migrationMaker();
    snapshotData = await takeSnapshot(maker);
    const service = maker.service(ServiceRoles.MIGRATION);
    migration = service.getMigration(Migrations.REDEEM_SAI);
    await shutDown();
  });

  afterAll(async () => {
    await restoreSnapshot(snapshotData, maker);
  });

  test('should be off after shutdown', async () => {
    const off = await migration.off();
    expect(off).toBe(true);
  });

  test('should get the exchange rate', async () => {
    const rate = await migration.getRate();
    expect(rate).toBe(0.0025);
  });

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
  });
});
