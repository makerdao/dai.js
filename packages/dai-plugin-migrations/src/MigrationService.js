import { PublicService } from '@makerdao/services-core';
import { ServiceRoles, Migrations } from './constants';
import SingleToMultiCdp from './migrations/SingleToMultiCdp';
import GlobalSettlementSavingsDai from './migrations/GlobalSettlementSavingsDai';
import GlobalSettlementCollateralClaims from './migrations/GlobalSettlementCollateralClaims';
import GlobalSettlementDaiRedeemer from './migrations/GlobalSettlementDaiRedeemer';
import SDaiToMDai from './migrations/SDaiToMDai';
import MkrRedeemer from './migrations/MkrRedeemer';
const { SINGLE_TO_MULTI_CDP, SDAI_TO_MDAI } = Migrations;

const migrations = {
  [SINGLE_TO_MULTI_CDP]: SingleToMultiCdp,
  [SDAI_TO_MDAI]: SDaiToMDai,
  [Migrations.GLOBAL_SETTLEMENT_SAVINGS_DAI]: GlobalSettlementSavingsDai,
  [Migrations.GLOBAL_SETTLEMENT_COLLATERAL_CLAIMS]: GlobalSettlementCollateralClaims,
  [Migrations.GLOBAL_SETTLEMENT_DAI_REDEEMER]: GlobalSettlementDaiRedeemer,
  [Migrations.MKR_REDEEMER]: MkrRedeemer
};

export default class MigrationService extends PublicService {
  constructor(name = ServiceRoles.MIGRATION) {
    super(name, ['smartContract', 'accounts', 'cdp', 'proxy', 'token', 'web3']);
  }

  getAllMigrationsIds() {
    return Object.values(Migrations);
  }

  getMigration(id) {
    return this._getCachedMigration(id);
  }

  async runAllChecks() {
    return {
      [SINGLE_TO_MULTI_CDP]: await this.getMigration(
        SINGLE_TO_MULTI_CDP
      ).check(),
      [SDAI_TO_MDAI]: await this.getMigration(SDAI_TO_MDAI).check()
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
