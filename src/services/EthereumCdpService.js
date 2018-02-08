import PrivateService from '../services/PrivateService';
import { promisifyAsyncMethods } from '../Utils';
import { Token }  from '../enums';

export default class CdpService extends PrivateService {

  /**
   * @param {string} name
   */
  constructor(name = 'makerdao') {
    super(name, ['log', 'web3']);
  }

  openCdp() {
    this.get('smartContract').getContractByName('tub').open().then((cdpId) => {
      return {
        lock: (amount, token) => this.lock(cdpId, amount, token)
      };
    });
  }

  lock(cdpId, amount, token) {

    let result = this.get('smartContract').getContractByName('tub').lock(cdpId, amount);

    if (token === Token.ETH) {
      result = this.get('smartContract').getContractByName('weth').deposit(amount)
        .then((wethAmount) => this.get('smartContract').getContractByName('weth').join(wethAmount))
        .then(result);
    }

    if (token === Token.WETH) {
      result = this.get('smartContract').getContractByName('tub').join(amount)
        .then(result);
    }

    return result;
  }

}