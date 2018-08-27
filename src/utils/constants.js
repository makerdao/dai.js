import BigNumber from 'bignumber.js';

export const WEI = new BigNumber('1e18');
export const WAD = new BigNumber('1e18');
export const RAY = new BigNumber('1e27');

export const UINT256_MAX =
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

export const AccountType = {
  PROVIDER: 'provider',
  PRIVATE_KEY: 'privateKey',
  BROWSER: 'browser'
};
