import PrivateService from '../core/PrivateService';
import tokens from '../../contracts/tokens';
import SmartContractService from '../../src/eth/SmartContractService';

export default class EthereumCdpService extends PrivateService {

  /**
   * @param {string} name
   */
  constructor(name = 'cdp') {
    super(name, ['smartContract']);
  }

  static buildTestService() {
    const service = new EthereumCdpService();
    const smartContract = SmartContractService.buildTestService();

    service.manager()
      .inject('smartContract', smartContract);
      
    console.log(smartContract);
    console.log(service);
    
    return service;
  }

  // returns the ID as a string (example: '338')
  openCdp() {
    this.get('smartContract').getContractByName(contracts.TUB).open();
  }

  // put collateral into a CDP
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

  // remove collateral from a CDP
  free(cdpId, amount){

    let result = this.get('smartContract').getContractByName('tub').free(cdpId, amount);
    return result;
  }

  // take Dai from a CDP and give to the wallet
  draw(cdpId, amount){
    let result = this.get('smartContract').getContractByName('tub').draw(cdpId, amount);
    return result;
  }

  // send Dai to a CDP to cancel debt
  wipe(cdpId, amount){
    
    let result = this.get('smartContract').getContractByName('tub').wipe(cdpId, amount);
    return result;
  }

    // free all collateral and close a CDP
    shut(cdpId){
    
      let result = this.get('smartContract').getContractByName('tub').shut(cdpId);
      return result;
    }

    // transfer control of a CDP to a different address
    give(cdpId, address){
      let result = this.get('smartContract').getContractByName('tub').give(cdpId, address);
      return result;
    }


  
_logEvent(eventTopic){
  this._provider.on([ eventTopic ], function(log) {
    console.log('Event Log for: ', eventTopic);
    console.log(log);
    });
  }
}
