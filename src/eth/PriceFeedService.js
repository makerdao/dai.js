import PrivateService from '../core/PrivateService';

export default class PriceFeedService extends PrivateService {
  // eslint-disable-next-line
  static buildTestService(suppressOutput = true) {
    const service = new PriceFeedService();
    return service;
  }

  /**
   * @param {string} name
   */

  constructor(name = 'priceFeed') {
    super(name);
  }
}
