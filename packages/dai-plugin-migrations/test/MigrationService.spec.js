import { migrationMaker } from './helpers';
import { ServiceRoles, Migrations } from '../src/constants';
import SingleToMultiCdp from '../src/migrations/SingleToMultiCdp';

let maker, service;

describe('Migration Service', () => {
  beforeAll(async () => {
    maker = await migrationMaker();
    service = maker.service(ServiceRoles.MIGRATION);
  });

  test('can fetch a list of all migrations', () => {
    const ids = service.getAllMigrationsIds();

    expect(ids).toEqual(
      expect.arrayContaining([
        Migrations.SINGLE_TO_MULTI_CDP
      ])
    );
    expect(ids.length).toEqual(1);
  });

  test('getting each migration returns a valid migration', () => {
    expect(service.getMigration(Migrations.SCD_TO_MCD_CDP)).toBeInstanceOf(
      SingleToMultiCdp
    );
  });

  test('getting a non-existent migration returns undefined', () => {
    expect(service.getMigration('non-existent')).toBeUndefined();
  });
});
