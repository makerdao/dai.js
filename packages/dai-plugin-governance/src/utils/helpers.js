import { createGetCurrency } from '@makerdao/currency';
import {
  MKR,
  STAGING_MAINNET_URL,
  KOVAN_URL,
  MAINNET_URL
} from './constants';

/**
 * @desc get network name
 * @param  {Number|String} id
 * @return {String}
 */
export const netIdToName = id => {
  switch (parseInt(id, 10)) {
    case 1:
      return 'mainnet';
    case 42:
      return 'kovan';
    case 999:
      return 'ganache';
    default:
      return '';
  }
};

export const netIdtoSpockUrl = id => {
  switch (parseInt(id, 10)) {
    case 1:
      return MAINNET_URL;
    case 42:
      return KOVAN_URL;
    default:
      return STAGING_MAINNET_URL;
  }
};

export const netIdtoSpockUrlStaging = id => {
  switch (parseInt(id, 10)) {
    case 1:
      return STAGING_MAINNET_URL;
    case 42:
      return KOVAN_URL;
    default:
      return STAGING_MAINNET_URL;
  }
};

export const getCurrency = createGetCurrency({ MKR });
