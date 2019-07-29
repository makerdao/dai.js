import { migrationMaker, setupCollateral } from '../helpers';
import { mockContracts, globalSettlement } from '../helpers/mocks';
import { ServiceRoles, Migrations } from '../../src/constants';
import { MDAI, ETH } from '@makerdao/dai-plugin-mcd';

let maker, migration, smartContract, cdpManager;

describe('Global Settlement Collateral Claims migration', () => {
  beforeAll(async () => {
    maker = await migrationMaker();

    await maker.getToken(MDAI).approveUnlimited(await maker.currentProxy());
    smartContract = maker.service('smartContract');
    cdpManager = maker.service('mcd:cdpManager');
    migration = maker
      .service(ServiceRoles.MIGRATION)
      .getMigration(Migrations.GLOBAL_SETTLEMENT_COLLATERAL_CLAIMS);
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
  });

  test('if the system is NOT in global settlement and there is no collateral, return false', async () => {
    mockContracts(smartContract, { MCD_END_1: globalSettlement.beforeCage });

    expect(await migration.check()).toBeFalsy();
  });

  test('if the system is NOT in global settlement and there is free collateral, return false', async () => {
    mockContracts(smartContract, { MCD_END_1: globalSettlement.beforeCage });

    await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
    const cdp = await cdpManager.openLockAndDraw('ETH-A', ETH(0.1), MDAI(0));

    expect(await migration.check()).toBeFalsy();

    await cdp.freeCollateral(ETH(0.1));
  });

  test('if the system is NOT in global settlement and there is NO free collateral, return false', async () => {
    mockContracts(smartContract, { MCD_END_1: globalSettlement.beforeCage });

    await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
    const cdp = await cdpManager.openLockAndDraw('ETH-A', ETH(0.1), MDAI(1));

    expect(await migration.check()).toBeFalsy();

    await cdp.wipeAndFree(MDAI(1), ETH(0.1));
  });

  test('if the system IS in global settlement and there is no collateral, return false', async () => {
    mockContracts(smartContract, { MCD_END_1: globalSettlement.afterCage });

    expect(await migration.check()).toBeFalsy();
  });

  test('if the system IS in global settlement and there is NO free collateral, return false', async () => {
    await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
    const cdp = await cdpManager.openLockAndDraw('ETH-A', ETH(0.1), MDAI(1));

    mockContracts(smartContract, { MCD_END_1: globalSettlement.afterCage });

    expect(await migration.check()).toBeFalsy();

    await cdp.wipeAndFree(MDAI(1), ETH(0.1));
  });

  test('if the system IS in global settlement and there is free collateral, return true', async () => {
    await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
    const cdp = await cdpManager.openLockAndDraw('ETH-A', ETH(0.1), MDAI(0));

    mockContracts(smartContract, { MCD_END_1: globalSettlement.afterCage });

    expect(await migration.check()).toBeTruthy();

    await cdp.wipeAndFree(MDAI(0), ETH(0.1));
  });
});
