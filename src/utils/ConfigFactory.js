import decentralizedOasisWithoutProxies from './configs/decentralized-oasis-without-proxies.json';
import kovan from './configs/kovan.json';
import http from './configs/http.json';
import merge from 'lodash.merge';

class ConfigPresetNotFoundError extends Error {
  constructor(message) {
    super('Cannot find configuration preset with name: ' + message);
  }
}

const serviceNames = [
  'allowance',
  'cdp',
  'conversionService',
  'exchange',
  'gasEstimator',
  'log',
  'priceFeed',
  'smartContract',
  'timer',
  'token',
  'transactionManager',
  'web3'
];

export default class ConfigFactory {
  /**
   * @param {string} presetName
   * @param {object} options
   */
  static create(presetName, options = {}) {
    if (typeof presetName !== 'string') {
      options = presetName;
      presetName = options.preset;
    }

    let baseConfig;
    switch (presetName) {
      case 'test':
      case 'decentralized-oasis-without-proxies':
        baseConfig = decentralizedOasisWithoutProxies;
        break;
      case 'http':
        baseConfig = http;
        break;
      case 'kovan':
        baseConfig = kovan;
        break;
      default:
        throw new ConfigPresetNotFoundError(presetName);
    }

    // make a copy so we don't overwrite the original values
    const config = merge({}, baseConfig);

    // add/merge any service-specific settings
    for (let service of serviceNames) {
      const serviceOptions = options[service];

      if (typeof serviceOptions === 'string') {
        config.services[service] = serviceOptions;
      } else if (typeof serviceOptions === 'object') {
        // convert service name to a name/settings pair
        if (typeof config.services[service] === 'string') {
          config.services[service] = [config.services[service], {}];
        }

        merge(config.services[service][1], serviceOptions);
      }
    }

    // convenience options

    if (options.log === false) {
      config.services.log = 'NullLogger';
    }

    // web3-specific convenience options

    if (options.url) {
      config.services.web3[1].provider.url = options.url;
    }

    if (options.privateKey) {
      config.services.web3[1].privateKey = options.privateKey;
    }

    if (options.provider) {
      merge(config.services.web3[1].provider, options.provider);
    }

    return config;
  }
}
