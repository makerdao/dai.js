import BigNumber from 'bignumber.js';

export const ServiceRoles = {
  MIGRATION: 'migration'
};

export const Migrations = {
  SINGLE_TO_MULTI_CDP: 'single-to-multi-cdp',
  SDAI_TO_MDAI: 'sdai-to-mdai',
  MKR_REDEEMER: 'mkr-redeemer'
};

export const WAD = new BigNumber('1e18');
export const RAY = new BigNumber('1e27');
export const RAD = new BigNumber('1e45');

export const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
