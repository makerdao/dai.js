import { migrationMaker, setupCollateral } from '../helpers';
import { mockContracts, globalSettlement } from '../helpers/mocks';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import { ServiceRoles, Migrations } from '../../src/constants';
import { ETH, DAI } from '@makerdao/dai-plugin-mcd';

let maker, migration, cdpManager, smartContract, snapshot;

function joinSavings(amountInDai) {
  return smartContract
    .getContract('PROXY_ACTIONS_DSR')
    .join(
      smartContract.getContractAddress('MCD_JOIN_DAI'),
      smartContract.getContractAddress('MCD_POT'),
      amountInDai.toFixed('wei'),
      { dsProxy: true }
    );
}

describe('Global Settlement Savings DAI Migration', () => {
  beforeAll(async () => {
    maker = await migrationMaker();
    const service = maker.service(ServiceRoles.MIGRATION);

    cdpManager = maker.service('mcd:cdpManager');
    smartContract = maker.service('smartContract');

    const dai = maker.getToken(DAI);
    const proxyAddress = await maker.service('proxy').ensureProxy();
    await dai.approveUnlimited(proxyAddress);

    migration = service.getMigration(Migrations.GLOBAL_SETTLEMENT_SAVINGS_DAI);
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot(maker);
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot, maker);
  });

  test('if the system is in global settlement and there is no DAI in savings DAI, return false', async () => {
    mockContracts(smartContract, { MCD_END_1: globalSettlement.afterCage() });

    expect(await migration.check()).toBeFalsy();
  });

  test('if the system is in global settlement and there is DAI in savings DAI, return true', async () => {
    await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
    await cdpManager.openLockAndDraw('ETH-A', ETH(5), DAI(100));
    await joinSavings(DAI(1));

    mockContracts(smartContract, { MCD_END_1: globalSettlement.afterCage() });

    expect(await migration.check()).toBeTruthy();
  });

  test('if the system is NOT in global settlement and there is no DAI in savings DAI, return false', async () => {
    mockContracts(smartContract, { MCD_END_1: globalSettlement.beforeCage() });

    expect(await migration.check()).toBeFalsy();
  });

  test('if the system is NOT in global settlement and there is DAI in savings DAI, return false', async () => {
    await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
    await cdpManager.openLockAndDraw('ETH-A', ETH(5), DAI(100));
    mockContracts(smartContract, { MCD_END_1: globalSettlement.beforeCage() });
    await joinSavings(DAI(1));

    expect(await migration.check()).toBeFalsy();
  });
});
