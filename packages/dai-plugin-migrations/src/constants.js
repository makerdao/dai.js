import BigNumber from 'bignumber.js';

export const ServiceRoles = {
  MIGRATION: 'migration'
};

export const Migrations = {
  GLOBAL_SETTLEMENT_SAVINGS_DAI: 'global-settlement-savings-dai',
  GLOBAL_SETTLEMENT_COLLATERAL_CLAIMS: 'global-settlement-collateral-claims',
  GLOBAL_SETTLEMENT_DAI_REDEEMER: 'global-settlement-dai-redeemer',
  MKR_REDEEMER: 'mkr-redeemer',
  CHIEF_MIGRATE: 'chief-migrate'
};

export const WAD = new BigNumber('1e18');
export const RAY = new BigNumber('1e27');
export const RAD = new BigNumber('1e45');
