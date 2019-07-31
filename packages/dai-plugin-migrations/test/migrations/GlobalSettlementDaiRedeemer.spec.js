import { migrationMaker, setupCollateral } from '../helpers';
import { mockContracts, globalSettlement } from '../helpers/mocks';
import TestAccountProvider from '../helpers/TestAccountProvider';
import { ServiceRoles, Migrations } from '../../src/constants';
import { MDAI, ETH } from '@makerdao/dai-plugin-mcd';

let maker, migration, smartContract, cdpManager;

describe('Global Settlement Dai Redeemer migration', () => {
  beforeAll(async () => {
    maker = await migrationMaker();

    await maker.getToken(MDAI).approveUnlimited(await maker.currentProxy());
    smartContract = maker.service('smartContract');
    cdpManager = maker.service('mcd:cdpManager');
    migration = maker
      .service(ServiceRoles.MIGRATION)
      .getMigration(Migrations.GLOBAL_SETTLEMENT_DAI_REDEEMER);
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
  });

  test('if the system is NOT in global settlement, return false', async () => {
    mockContracts(smartContract, { MCD_END_1: globalSettlement.beforeCage() });

    expect(await migration.check()).toBeFalsy();
  });

  test('if the system is in global settlement but collateral price has not been fixed, return false', async () => {
    mockContracts(smartContract, { MCD_END_1: globalSettlement.afterCage() });

    expect(await migration.check()).toBeFalsy();
  });

  test('if the system is in global settlement, user owns some DAI, but collateral price has not been fixed, return false', async () => {
    await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
    const cdp = await cdpManager.openLockAndDraw('ETH-A', ETH(0.1), MDAI(10));

    mockContracts(smartContract, { MCD_END_1: globalSettlement.afterCage() });

    expect(await migration.check()).toBeFalsy();

    await cdp.wipeAndFree(10, ETH(0.1));
  });

  test('if the system IS in global settlement, collateral price has been fixed, BUT user does not own any DAI return false', async () => {
    mockContracts(smartContract, {
      MCD_END_1: globalSettlement.afterFlow({
        'ETH-A': 10
      })
    });

    expect(await migration.check()).toBeFalsy();
  });

  test('if the system IS in global settlement, collateral price has been fixed, the user owns DAI, and the user has locked collateral, return true', async () => {
    await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
    const cdp = await cdpManager.openLockAndDraw('ETH-A', ETH(0.1), MDAI(10));

    mockContracts(smartContract, {
      MCD_END_1: globalSettlement.afterFlow({
        'ETH-A': 10
      })
    });

    expect(await migration.check()).toBeTruthy();

    await cdp.wipeAndFree(10, ETH(0.1));
  });

  test('if the system IS in global settlement, collateral price has been fixed, the user owns DAI, but the user does NOT have locked collateral, return false', async () => {
    await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
    await cdpManager.openLockAndDraw('ETH-A', ETH(0.1), MDAI(10));

    const account2 = TestAccountProvider.nextAccount();

    const mdai = maker.service('token').getToken(MDAI);
    await mdai.transfer(account2.address, 10);

    await maker.addAccount({ ...account2, type: 'privateKey' });
    maker.useAccount(account2.address);
    expect((await mdai.balance()).toNumber()).toBe(10);

    mockContracts(smartContract, {
      MCD_END_1: globalSettlement.afterFlow({
        'ETH-A': 10
      })
    });

    expect(await migration.check()).toBeFalsy();
  });
});
