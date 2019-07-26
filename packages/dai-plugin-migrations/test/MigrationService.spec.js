import { migrationMaker } from './helpers';
import { ServiceRoles, Migrations } from '../src/constants';
import SingleToMultiCdp from '../src/migrations/SingleToMultiCdp';
import SDaiToMDai from '../src/migrations/SDaiToMDai';

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
        Migrations.SINGLE_TO_MULTI_CDP,
        Migrations.SDAI_TO_MDAI
      ])
    );
    expect(ids.length).toEqual(2);
  });

  test('getting each migration returns a valid migration', () => {
    expect(service.getMigration(Migrations.SINGLE_TO_MULTI_CDP)).toBeInstanceOf(
      SingleToMultiCdp
    );
    expect(service.getMigration(Migrations.SDAI_TO_MDAI)).toBeInstanceOf(
      SDaiToMDai
    );
  });

  test('getting a non-existent migration returns undefined', () => {
    expect(service.getMigration('non-existent')).toBeUndefined();
  });
});
