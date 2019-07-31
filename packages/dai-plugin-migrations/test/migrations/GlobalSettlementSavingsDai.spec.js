import { migrationMaker, setupCollateral } from '../helpers';
import { mockContracts, globalSettlement } from '../helpers/mocks';
import { ServiceRoles, Migrations } from '../../src/constants';
import { ETH, MDAI } from '@makerdao/dai-plugin-mcd';

let maker, migration, cdpManager, smartContract;

function joinSavings(amountInDai) {
  return smartContract
    .getContract('PROXY_ACTIONS')
    .dsrJoin(
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

    const dai = maker.getToken(MDAI);
    const proxyAddress = await maker.service('proxy').ensureProxy();
    await dai.approveUnlimited(proxyAddress);

    migration = service.getMigration(Migrations.GLOBAL_SETTLEMENT_SAVINGS_DAI);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('if the system is in global settlement and there is no DAI in savings DAI, return false', async () => {
    mockContracts(smartContract, { MCD_END_1: globalSettlement.afterCage() });

    expect(await migration.check()).toBeFalsy();
  });

  test('if the system is in global settlement and there is DAI in savings DAI, return true', async () => {
    await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
    await cdpManager.openLockAndDraw('ETH-A', ETH(0.1), MDAI(1));
    await joinSavings(MDAI(1));

    mockContracts(smartContract, { MCD_END_1: globalSettlement.afterCage() });

    expect(await migration.check()).toBeTruthy();
  });

  test('if the system is NOT in global settlement and there is no DAI in savings DAI, return false', async () => {
    mockContracts(smartContract, { MCD_END_1: globalSettlement.beforeCage() });

    expect(await migration.check()).toBeFalsy();
  });

  test('if the system is NOT in global settlement and there is DAI in savings DAI, return false', async () => {
    await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
    await cdpManager.openLockAndDraw('ETH-A', ETH(0.1), MDAI(1));
    mockContracts(smartContract, { MCD_END_1: globalSettlement.beforeCage() });
    await joinSavings(MDAI(1));

    expect(await migration.check()).toBeFalsy();
  });
});
