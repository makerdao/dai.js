import { migrationMaker } from './helpers';
import { mockCdpIds } from './helpers/mocks';
import { ServiceRoles, Migrations } from '../src/constants';
import SingleToMultiCdp from '../src/migrations/SingleToMultiCdp';
import SaiToDai from '../src/migrations/SaiToDai';
import GlobalSettlementSavingsDai from '../src/migrations/GlobalSettlementSavingsDai';
import GlobalSettlementCollateralClaims from '../src/migrations/GlobalSettlementCollateralClaims';
import GlobalSettlementDaiRedeemer from '../src/migrations/GlobalSettlementDaiRedeemer';
import MkrRedeemer from '../src/migrations/MkrRedeemer';

let maker, service;

beforeAll(async () => {
  maker = await migrationMaker();
  service = maker.service(ServiceRoles.MIGRATION);
});

test('can access migration contracts', async () => {
  const managerAddress = maker
    .service('smartContract')
    .getContract('CDP_MANAGER').address;
  const migration = maker.service('smartContract').getContract('MIGRATION');
  const migrationProxyActions = maker
    .service('smartContract')
    .getContract('MIGRATION_PROXY_ACTIONS');
  const migrationManager = await migration.cdpManager();

  expect(migration).toBeDefined();
  expect(migrationManager.toLowerCase()).toBe(managerAddress);
  expect(migrationProxyActions).toBeDefined();
});

test('can fetch a list of all migrations', () => {
  const ids = service.getAllMigrationsIds();

  expect(ids).toEqual(
    expect.arrayContaining([
      Migrations.SINGLE_TO_MULTI_CDP,
      Migrations.SAI_TO_DAI,
      Migrations.GLOBAL_SETTLEMENT_SAVINGS_DAI,
      Migrations.GLOBAL_SETTLEMENT_COLLATERAL_CLAIMS,
      Migrations.GLOBAL_SETTLEMENT_DAI_REDEEMER,
      Migrations.MKR_REDEEMER,
      Migrations.CHIEF_MIGRATE
    ])
  );
  expect(ids.length).toEqual(8);
});

test('getting each migration returns a valid migration', () => {
  expect(service.getMigration(Migrations.SINGLE_TO_MULTI_CDP)).toBeInstanceOf(
    SingleToMultiCdp
  );
  expect(service.getMigration(Migrations.SAI_TO_DAI)).toBeInstanceOf(SaiToDai);
  expect(
    service.getMigration(Migrations.GLOBAL_SETTLEMENT_SAVINGS_DAI)
  ).toBeInstanceOf(GlobalSettlementSavingsDai);
  expect(
    service.getMigration(Migrations.GLOBAL_SETTLEMENT_COLLATERAL_CLAIMS)
  ).toBeInstanceOf(GlobalSettlementCollateralClaims);
  expect(
    service.getMigration(Migrations.GLOBAL_SETTLEMENT_DAI_REDEEMER)
  ).toBeInstanceOf(GlobalSettlementDaiRedeemer);
  expect(service.getMigration(Migrations.MKR_REDEEMER)).toBeInstanceOf(
    MkrRedeemer
  );
});

test('getting a non-existent migration returns undefined', () => {
  expect(service.getMigration('non-existent')).toBeUndefined();
});

test('runAllChecks', async () => {
  await mockCdpIds(maker);
  const result = await service.runAllChecks();
  expect(result).toEqual({
    [Migrations.SAI_TO_DAI]: expect.anything(),
    [Migrations.DAI_TO_SAI]: expect.anything(),
    [Migrations.SINGLE_TO_MULTI_CDP]: {},
    [Migrations.CHIEF_MIGRATE]: expect.anything(),
    [Migrations.MKR_REDEEMER]: expect.anything()
  });
  // expect(result[Migrations.SAI_TO_DAI].eq(0)).toBeTruthy();
});
