import { PublicService } from '@makerdao/services-core';
import { ServiceRoles, Migrations } from './constants';
import SingleToMultiCdp from './migrations/SingleToMultiCdp';
import GlobalSettlementSavingsDai from './migrations/GlobalSettlementSavingsDai';
import GlobalSettlementCollateralClaims from './migrations/GlobalSettlementCollateralClaims';
import GlobalSettlementDaiRedeemer from './migrations/GlobalSettlementDaiRedeemer';
import SDaiToMDai from './migrations/SDaiToMDai';
import MkrRedeemer from './migrations/MkrRedeemer';

const migrations = {
  [Migrations.SINGLE_TO_MULTI_CDP]: SingleToMultiCdp,
  [Migrations.SDAI_TO_MDAI]: SDaiToMDai,
  [Migrations.GLOBAL_SETTLEMENT_SAVINGS_DAI]: GlobalSettlementSavingsDai,
  [Migrations.GLOBAL_SETTLEMENT_COLLATERAL_CLAIMS]: GlobalSettlementCollateralClaims,
  [Migrations.GLOBAL_SETTLEMENT_DAI_REDEEMER]: GlobalSettlementDaiRedeemer,
  [Migrations.MKR_REDEEMER]: MkrRedeemer
};

export default class MigrationService extends PublicService {
  constructor(name = ServiceRoles.MIGRATION) {
    super(name, ['smartContract', 'accounts', 'cdp', 'proxy', 'token']);
  }

  getAllMigrationsIds() {
    return Object.values(Migrations);
  }

  getMigration(id) {
    const migration = migrations[id];
    return migration && new migration(this);
  }
}
