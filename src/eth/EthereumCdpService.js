import PrivateService from '../core/PrivateService';
import SmartContractService from '../../src/eth/SmartContractService';
import tokens from '../../contracts/tokens';
import contracts from '../../contracts/contracts';
var utils = require('ethers').utils;


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
    
    return service;
  }

  openCdp() {
    let contract = this.get('smartContract');
    let ethersProvider = contract.get('web3')._ethersProvider;
    let tubContract = contract.getContractByName(contracts.TUB);

    tubContract.onlognewcup = function(address, cdpIdBytes32) {
      console.log('cup created, cdpId is: ', utils.bigNumberify(cdpIdBytes32).toString());
    };

    return tubContract.open().then((transaction) => {
      return ethersProvider.waitForTransaction(transaction.hash).then(function(transactionHash) {
        return transactionHash;
      });
    });
  }

  // put collateral into a CDP
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


  // can look for tx hash and/or events related to wallet address   
  _logEvent(eventTopic){
    this._provider.on([ eventTopic ], function(log) {
      console.log('Event Log for: ', eventTopic);
      console.log(log);
    });
  }
}
