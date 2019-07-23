import { PublicService } from '@makerdao/services-core';
import { ServiceRoles, Migrations } from './constants';
import ScdToMcdCdp from './migrations/ScdToMcdCdp';

const migrations = {
  [Migrations.SCD_TO_MCD_CDP]: ScdToMcdCdp
};

export default class MigrationService extends PublicService {
  constructor(name = ServiceRoles.MIGRATION) {
    super(name, ['smartContract', 'accounts', 'cdp', 'proxy']);
  }

  getAllMigrationsIds() {
    return Object.values(Migrations);
  }

  getMigration(id) {
    const migration = migrations[id];
    return migration && new migration(this);
  }
}
