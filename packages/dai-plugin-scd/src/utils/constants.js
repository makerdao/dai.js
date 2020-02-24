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
}

export const ServiceRoles = {
  CDP: 'scd:cdp',
  PRICE: 'scd:price',
  PROXY_CDP: 'scd:proxyCdp',
  QUERY_API: 'scd:queryApi'
}

export const CDP = 'CDP'
export const PRICE = 'PRICE'
export const PROXY_CDP = 'PROXY_CDP'
export const QUERY_API = 'QUERY_API'
