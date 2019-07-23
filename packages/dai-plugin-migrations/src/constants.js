import BigNumber from 'bignumber.js';

export const ServiceRoles = {
  MIGRATION: 'migration'
};

export const Migrations = {
  SCD_TO_MCD_CDP: 'scd-to-mcd-cdp'
};

export const WAD = new BigNumber('1e18');
export const RAY = new BigNumber('1e27');
export const RAD = new BigNumber('1e45');

export const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
