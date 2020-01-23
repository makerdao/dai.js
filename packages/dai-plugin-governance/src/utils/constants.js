import { createCurrency } from '@makerdao/currency';

export const MKR = createCurrency('MKR');
export const IOU = createCurrency('IOU');

/* Contracts */
export const VOTE_PROXY_FACTORY = 'VOTE_PROXY_FACTORY';
export const POLLING = 'POLLING';
export const CHIEF = 'CHIEF';
export const ESM = 'ESM';
export const END = 'END';
export const PAUSE = 'PAUSE';

/* Addresses */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/* Spock URLs */
export const LOCAL_URL = 'http://localhost:3001/v1';
export const KOVAN_URL = 'https://staging-gov-db.makerfoundation.com/api/v1';
export const STAGING_MAINNET_URL =
  'https://qa-gov-db.makerfoundation.com/api/v1';
export const MAINNET_URL = 'https://gov-db.makerfoundation.com/api/v1';
