import BigNumber from 'bignumber.js';

export const ServiceRoles = {
  MIGRATION: 'migration'
};

export const Migrations = {
  SINGLE_TO_MULTI_CDP: 'single-to-multi-cdp',
  GLOBAL_SETTLEMENT_SAVINGS_DAI: 'global-settlement-savings-dai',
  SDAI_TO_MDAI: 'sdai-to-mdai'
};

export const WAD = new BigNumber('1e18');
export const RAY = new BigNumber('1e27');
export const RAD = new BigNumber('1e45');
