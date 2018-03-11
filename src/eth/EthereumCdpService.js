import PrivateService from '../core/PrivateService';
import tokens from '../../contracts/tokens';

export default class CdpService extends PrivateService {

  constructor(name = 'cdp') {
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

    if (token === tokens.ETH) {
      result = this.get('smartContract').getContractByName('weth').deposit(amount)
        .then((wethAmount) => this.get('smartContract').getContractByName('weth').join(wethAmount))
        .then(result);
    }

    if (token === tokens.WETH) {
      result = this.get('smartContract').getContractByName('tub').join(amount)
        .then(result);
    }

    return result;
  }
}