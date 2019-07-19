import { PublicService } from '@makerdao/services-core';
import { ServiceRoles, Migrations } from './constants';
import ScdCdpToMcdCdp from './migrations/ScdCdpToMcdCdp';

const migrations = {
  [Migrations.SCD_TO_MCD_CDP]: ScdCdpToMcdCdp
};

export default class MigrationService extends PublicService {
  constructor(name = ServiceRoles.MIGRATION) {
    super(name, ['smartContract']);
  }

  getAllMigrationsIds() {
    return Object.values(Migrations);
  }

  getMigration(id) {
    const migration = migrations[id];
    return migration && new migration(this);
  }
}
