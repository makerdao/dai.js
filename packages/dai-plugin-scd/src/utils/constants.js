import BigNumber from 'bignumber.js';

export const WEI = new BigNumber('1e18');
export const WAD = new BigNumber('1e18');
export const RAY = new BigNumber('1e27');
export const RAD = new BigNumber('1e45');

export const UINT256_MAX =
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

export const AccountType = {
  PROVIDER: 'provider',
  PRIVATE_KEY: 'privateKey',
  BROWSER: 'browser'
};

export const ServiceRoles = {
  CDP: 'cdp',
  PRICE: 'price'
  // CONVERSION: 'conversion'
  // QUERY_API: 'queryApi'
};

// export const CDP = 'cdp';
// export const PRICE = 'price';
