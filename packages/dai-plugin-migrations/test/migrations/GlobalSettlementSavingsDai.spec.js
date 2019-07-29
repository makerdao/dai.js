import { migrationMaker } from '../helpers';
import { mockContracts, globalSettlement } from '../helpers/mocks';
import { ServiceRoles, Migrations } from '../../src/constants';
import { MDAI } from '@makerdao/dai-plugin-mcd';

let maker, migration, smartContract, savingsService;

describe('Global Settlement Savings DAI Migration', () => {
  beforeAll(async () => {
    maker = await migrationMaker();
    const service = maker.service(ServiceRoles.MIGRATION);

    savingsService = maker.service('mcd:savings');
    smartContract = maker.service('smartContract');

    migration = service.getMigration(Migrations.GLOBAL_SETTLEMENT_SAVINGS_DAI);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('if the system is in global settlement and there is no DAI in savings DAI, return false', async () => {
    mockContracts(smartContract, { MCD_END_1: globalSettlement.afterCage });
    savingsService.balance = jest.fn(() => MDAI(0));

    expect(await migration.check()).toBeFalsy();
  });

  test('if the system is in global settlement and there is DAI in savings DAI, return true', async () => {
    mockContracts(smartContract, { MCD_END_1: globalSettlement.afterCage });
    savingsService.balance = jest.fn(() => MDAI(10));

    expect(await migration.check()).toBeTruthy();
  });

  test('if the system is NOT in global settlement and there is no DAI in savings DAI, return false', async () => {
    mockContracts(smartContract, { MCD_END_1: globalSettlement.beforeCage });
    savingsService.balance = jest.fn(() => MDAI(0));

    expect(await migration.check()).toBeFalsy();
  });

  test('if the system is NOT in global settlement and there is DAI in savings DAI, return false', async () => {
    mockContracts(smartContract, { MCD_END_1: globalSettlement.beforeCage });
    savingsService.balance = jest.fn(() => MDAI(10));

    expect(await migration.check()).toBeFalsy();
  });
});
