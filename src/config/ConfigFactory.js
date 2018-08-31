import test from './presets/test.json';
import kovan from './presets/kovan.json';
import http from './presets/http.json';
import mainnet from './presets/mainnet.json';
import browser from './presets/browser.json';
import merge from 'lodash.merge';
import intersection from 'lodash.intersection';
import { mergeServiceConfig } from './index';
import { AccountType } from '../utils/constants';

class ConfigPresetNotFoundError extends Error {
  constructor(message) {
    super('Cannot find configuration preset with name: ' + message);
  }
}

const serviceRoles = [
  'accounts',
  'allowance',
  'cdp',
  'conversion',
  'exchange',
  'gasEstimator',
  'log',
  'price',
  'smartContract',
  'timer',
  'token',
  'transactionManager',
  'web3',
  'nonce'
];

function loadPreset(name) {
  if (typeof name == 'object') {
    return name; // for testing
  }

  let preset;
  switch (name) {
    case 'test':
      preset = test;
      break;
    case 'http':
      preset = http;
      break;
    case 'kovan':
      preset = kovan;
      break;
    case 'mainnet':
      preset = mainnet;
      break;
    case 'browser':
      preset = browser;
      break;
    default:
      throw new ConfigPresetNotFoundError(name);
  }
  // make a copy so we don't overwrite the original values
  return merge({}, preset);
}

const reservedWords = [
  'accounts',
  'overrideMetamask',
  'plugins',
  'privateKey',
  'provider',
  'url'
];

export default class ConfigFactory {
  /**
   * @param {string} preset
   * @param {object} options
   */
  static create(preset, options = {}, resolver) {
    if (typeof preset !== 'string') {
      options = preset;
      preset = options.preset;
    }

    const config = loadPreset(preset);
    const additionalServices = options.additionalServices || [];

    const usedReservedWords = intersection(additionalServices, reservedWords);
    if (usedReservedWords.length > 0) {
      throw new Error(
        'The following words cannot be used as service role names: ' +
          usedReservedWords.join(', ')
      );
    }

    for (let role of serviceRoles.concat(additionalServices)) {
      if (!(role in options)) continue;
      if (!(role in config)) {
        config[role] = options[role];
        continue;
      }
      config[role] = mergeServiceConfig(
        role,
        config[role],
        options[role],
        resolver
      );
    }

    // web3-specific convenience options
    if (config.web3) {
      const web3Settings = config.web3[1] || config.web3;
      if (!web3Settings.provider) web3Settings.provider = {};

      if (options.url) {
        web3Settings.provider.url = options.url;
      }

      if (options.provider) {
        merge(web3Settings.provider, options.provider);
      }
    }

    // accounts-specific convenience option
    if (options.privateKey) {
      config.accounts = {
        ...config.accounts,
        default: { type: AccountType.PRIVATE_KEY, key: options.privateKey }
      };
    }

    // default settings for transactions
    if (options.transactionSettings) {
      config.transactionSettings = options.transactionSettings;
    }

    return config;
  }
}
