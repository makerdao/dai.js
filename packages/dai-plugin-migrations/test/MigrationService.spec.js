import { migrationMaker } from './helpers';
import { ServiceRoles, Migrations } from '../src/constants';
import ScdCdpToMcdCdp from '../src/migrations/ScdCdpToMcdCdp';

let maker, service;

describe('Migration Service', () => {
  beforeAll(async () => {
    maker = await migrationMaker();
    service = maker.service(ServiceRoles.MIGRATION);
  });

  test('can fetch a list of all migrations', () => {
    const ids = service.getAllMigrationsIds();

    expect(ids.length).toEqual(1);
    expect(ids).toEqual(expect.arrayContaining([Migrations.SCD_TO_MCD_CDP]));
  });

  test('getting each migration returns a valid migration', () => {
    expect(service.getMigration(Migrations.SCD_TO_MCD_CDP)).toBeInstanceOf(
      ScdCdpToMcdCdp
    );
  });

  test('getting a non-existent migration returns undefined', () => {
    expect(service.getMigration('non-existent')).toBeUndefined();
  });
});
