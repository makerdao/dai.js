import { PublicService } from '@makerdao/services-core';
import { ServiceRoles, Migrations } from './constants';
import SingleToMultiCdp from './migrations/SingleToMultiCdp';
import GlobalSettlementSavingsDai from './migrations/GlobalSettlementSavingsDai';
import GlobalSettlementCollateralClaims from './migrations/GlobalSettlementCollateralClaims';
import GlobalSettlementDaiRedeemer from './migrations/GlobalSettlementDaiRedeemer';
import SaiToDai from './migrations/SaiToDai';
import MkrRedeemer from './migrations/MkrRedeemer';
import DaiToSai from './migrations/DaiToSai';
import ChiefMigrate from './migrations/ChiefMigrate';
import RedeemSai from './migrations/RedeemSai';
import RedeemCollateral from './migrations/RedeemCollateral';

const {
  SINGLE_TO_MULTI_CDP,
  SAI_TO_DAI,
  DAI_TO_SAI,
  MKR_REDEEMER,
  CHIEF_MIGRATE
} = Migrations;

const migrations = {
  [SINGLE_TO_MULTI_CDP]: SingleToMultiCdp,
  [SAI_TO_DAI]: SaiToDai,
  [DAI_TO_SAI]: DaiToSai,
  [CHIEF_MIGRATE]: ChiefMigrate,
  [Migrations.GLOBAL_SETTLEMENT_SAVINGS_DAI]: GlobalSettlementSavingsDai,
  [Migrations.GLOBAL_SETTLEMENT_COLLATERAL_CLAIMS]: GlobalSettlementCollateralClaims,
  [Migrations.GLOBAL_SETTLEMENT_DAI_REDEEMER]: GlobalSettlementDaiRedeemer,
  [Migrations.MKR_REDEEMER]: MkrRedeemer,
  [Migrations.REDEEM_SAI]: RedeemSai,
  [Migrations.REDEEM_COLLATERAL]: RedeemCollateral
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
      [SINGLE_TO_MULTI_CDP]: await this.getMigration(
        SINGLE_TO_MULTI_CDP
      ).check(),
      [SAI_TO_DAI]: await this.getMigration(SAI_TO_DAI).check(),
      [DAI_TO_SAI]: await this.getMigration(DAI_TO_SAI).check(),
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
