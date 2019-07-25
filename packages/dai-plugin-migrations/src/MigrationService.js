import { PublicService } from '@makerdao/services-core';
import { ServiceRoles, Migrations } from './constants';
import SingleToMultiCdp from './migrations/SingleToMultiCdp';

const migrations = {
  [Migrations.SINGLE_TO_MULTI_CDP]: SingleToMultiCdp
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
