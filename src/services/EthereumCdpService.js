import PrivateService from '../services/PrivateService';
import Web3 from 'web3';
import { promisifyAsyncMethods } from '../Utils';

export default class CdpService extends PrivateService {

  /**
   * @param {string} name
   */
  constructor(name = 'makerdao') {
    super(name, ['log', 'web3']);
  }

  openCdp() {
    this.get('web3').contract('tub').open().then((cdpId) => {
      return {
        lock: (amount, token) => this.lock(cdpId, amount, token)
      }
    });
  }

  lock(cdpId, amount, token) {

    let result = _promisify(() => this.get('web3').contract('tub').lock(cdpId, amount));

    if (token === ETH) {
      result = this.get('web3').contract('weth').deposit(amount)
        .then((wethAmount) => this.get('web3').contract('tub').join(wethAmount))
        .then(result);
    }

    if (token === WETH) {
      result = this.get('web3').contract('tub').join(amount)
        .then(result);
    }

    return result;
  }

}