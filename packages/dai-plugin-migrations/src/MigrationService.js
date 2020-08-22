import { PublicService } from '@makerdao/services-core';
import { ServiceRoles, Migrations } from './constants';
import GlobalSettlementSavingsDai from './migrations/GlobalSettlementSavingsDai';
import GlobalSettlementCollateralClaims from './migrations/GlobalSettlementCollateralClaims';
import GlobalSettlementDaiRedeemer from './migrations/GlobalSettlementDaiRedeemer';
import MkrRedeemer from './migrations/MkrRedeemer';
import ChiefMigrate from './migrations/ChiefMigrate';

const { MKR_REDEEMER, CHIEF_MIGRATE } = Migrations;

const migrations = {
  [CHIEF_MIGRATE]: ChiefMigrate,
  [Migrations.GLOBAL_SETTLEMENT_SAVINGS_DAI]: GlobalSettlementSavingsDai,
  [Migrations.GLOBAL_SETTLEMENT_COLLATERAL_CLAIMS]: GlobalSettlementCollateralClaims,
  [Migrations.GLOBAL_SETTLEMENT_DAI_REDEEMER]: GlobalSettlementDaiRedeemer,
  [Migrations.MKR_REDEEMER]: MkrRedeemer
};

export default class MigrationService extends PublicService {
  constructor(name = ServiceRoles.MIGRATION) {
    super(name, [
      'smartContract',
      'accounts',
      'cdp',
      'proxy',
      'token',
      'web3',
      'mcd:cdpManager',
      'mcd:cdpType',
      'price'
    ]);
  }

  getAllMigrationsIds() {
    return Object.values(Migrations);
  }

  getMigration(id) {
    return this._getCachedMigration(id);
  }

  async runAllChecks() {
    return {
      [CHIEF_MIGRATE]: await this.getMigration(CHIEF_MIGRATE).check(),
      [MKR_REDEEMER]: await this.getMigration(MKR_REDEEMER).check(),
      [Migrations.GLOBAL_SETTLEMENT_COLLATERAL_CLAIMS]: await this.getMigration(
        Migrations.GLOBAL_SETTLEMENT_COLLATERAL_CLAIMS
      ).check()
    };
  }

  _getCachedMigration(id) {
    if (!this._cache) this._cache = {};
    if (!this._cache[id]) {
      const migration = migrations[id];
      if (!migration) return;
      this._cache[id] = new migration(this);
    }
    return this._cache[id];
  }
}
