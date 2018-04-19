/* eslint-disable */
import PrivateService from '../../core/PrivateService';

export default class ConsoleLogger extends PrivateService {
  /**
   * @param {string} name
   */
  constructor(name = 'log') {
    super(name);
  }

  debug(...args) {
    console.log(...args);
  }

  info(...args) {
    console.info(...args);
  }

  warn(...args) {
    console.warn(...args);
  }

  error(...args) {
    console.error(...args);
  }

  trace(...args) {
    console.trace(...args);
  }
}
