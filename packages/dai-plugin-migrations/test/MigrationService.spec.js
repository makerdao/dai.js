import { migrationMaker } from './helpers';
import { mockCdpIds } from './helpers/mocks';
import { ServiceRoles, Migrations } from '../src/constants';
import GlobalSettlementSavingsDai from '../src/migrations/GlobalSettlementSavingsDai';
import GlobalSettlementCollateralClaims from '../src/migrations/GlobalSettlementCollateralClaims';
import GlobalSettlementDaiRedeemer from '../src/migrations/GlobalSettlementDaiRedeemer';
import MkrRedeemer from '../src/migrations/MkrRedeemer';

let maker, service;

beforeAll(async () => {
  maker = await migrationMaker();
  service = maker.service(ServiceRoles.MIGRATION);
});

xtest('can access migration contracts', async () => {
  const managerAddress = maker
    .service('smartContract')
    .getContract('CDP_MANAGER').address;
  const migration = maker.service('smartContract').getContract('MIGRATION');
  const migrationProxyActions = maker
    .service('smartContract')
    .getContract('MIGRATION_PROXY_ACTIONS');
  const migrationManager = await migration.cdpManager();

  expect(migration).toBeDefined();
  expect(migrationManager).toBe(managerAddress);
  expect(migrationProxyActions).toBeDefined();
});

test('can fetch a list of all migrations', () => {
  const ids = service.getAllMigrationsIds();

  expect(ids).toEqual(
    expect.arrayContaining([
      Migrations.GLOBAL_SETTLEMENT_SAVINGS_DAI,
      Migrations.GLOBAL_SETTLEMENT_COLLATERAL_CLAIMS,
      Migrations.GLOBAL_SETTLEMENT_DAI_REDEEMER,
      Migrations.MKR_REDEEMER,
      Migrations.CHIEF_MIGRATE
    ])
  );
  expect(ids.length).toEqual(5);
});

test('getting each migration returns a valid migration', () => {
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
    [Migrations.CHIEF_MIGRATE]: expect.anything(),
    [Migrations.MKR_REDEEMER]: expect.anything(),
    [Migrations.GLOBAL_SETTLEMENT_COLLATERAL_CLAIMS]: expect.anything()
  });
});
