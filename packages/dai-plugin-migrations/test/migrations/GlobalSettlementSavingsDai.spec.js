import { migrationMaker } from '../helpers';
import { ServiceRoles, Migrations } from '../../src/constants';
import { MDAI } from '@makerdao/dai-plugin-mcd';

let maker, migration, globalSettlementService, savingsService;

describe('Global Settlement Savings DAI Migration', () => {
  beforeAll(async () => {
    maker = await migrationMaker();
    const service = maker.service(ServiceRoles.MIGRATION);

    globalSettlementService = maker.service('mcd:globalSettlement');
    savingsService = maker.service('mcd:savings');

    migration = service.getMigration(Migrations.GLOBAL_SETTLEMENT_SAVINGS_DAI);
  });

  test('if the system is in global settlement and there is no DAI in savings DAI, return false', async () => {
    globalSettlementService.isInProgress = jest.fn(() => true);
    savingsService.balance = jest.fn(() => MDAI(0));

    expect(await migration.check()).toBeFalsy();
  });

  test('if the system is in global settlement and there is DAI in savings DAI, return true', async () => {
    globalSettlementService.isInProgress = jest.fn(() => true);
    savingsService.balance = jest.fn(() => MDAI(10));

    expect(await migration.check()).toBeTruthy();
  });

  test('if the system is NOT in global settlement and there is no DAI in savings DAI, return false', async () => {
    globalSettlementService.isInProgress = jest.fn(() => false);
    savingsService.balance = jest.fn(() => MDAI(0));

    expect(await migration.check()).toBeFalsy();
  });

  test('if the system is NOT in global settlement and there is DAI in savings DAI, return false', async () => {
    globalSettlementService.isInProgress = jest.fn(() => false);
    savingsService.balance = jest.fn(() => MDAI(10));

    expect(await migration.check()).toBeFalsy();
  });
});
