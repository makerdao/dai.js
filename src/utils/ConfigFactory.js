import decentralizedOasisWithoutProxies from './configs/decentralized-oasis-without-proxies.json';

class ConfigPresetNotFoundError extends Error {
  constructor(message) {
    super('Cannot find configuration preset with name: ' + message);
  }
}

export default class ConfigFactory {
  /**
   * @param {string} presetName
   */
  static create(presetName) {
    switch (presetName) {
    case 'decentralized-oasis-without-proxies':
      return decentralizedOasisWithoutProxies;
    default:
      throw new ConfigPresetNotFoundError(presetName);
    }
  }
}
