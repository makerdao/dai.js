import { LocalService, ServiceManager } from '@makerdao/services-core';

const _ = () => {};

export default class NullLogger extends LocalService {
  /**
   * @param {string} name
   */
  constructor(name = 'log') {
    super(name);
  }

  /**
   * @param {object} service
   * @returns {object}
   */
  serviceLogger(service) {
    if (!ServiceManager.isValidService(service)) {
      throw new Error('Invalid service object');
    }

    return { trace: _, debug: _, info: _, warn: _, error: _, fatal: _ };
  }

  trace() {}
  debug() {}
  info() {}
  warn() {}
  error() {}
  fatal() {}
}
