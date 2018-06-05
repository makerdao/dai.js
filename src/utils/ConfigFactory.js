import decentralizedOasisWithoutProxies from './configs/decentralized-oasis-without-proxies.json';
import kovan from './configs/kovan.json';

class ConfigPresetNotFoundError extends Error {
  constructor(message) {
    super('Cannot find configuration preset with name: ' + message);
  }
}

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

    let config;
    switch (presetName) {
      case 'test':
      case 'decentralized-oasis-without-proxies':
        config = decentralizedOasisWithoutProxies;
        break;
      case 'kovan':
        config = kovan;
        break;
      default:
        throw new ConfigPresetNotFoundError(presetName);
    }

    if (options.log === false) {
      config.services.log = 'NullLogger';
    }

    return config;
  }
}
