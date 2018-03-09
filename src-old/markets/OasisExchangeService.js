import PublicService from '../services/PublicService';

export default class OasisExchangeService extends PublicService {

  /**
   * @param {string} name
   */
  constructor(name = 'OasisExchangeService') {
    super(name);
  }

}
