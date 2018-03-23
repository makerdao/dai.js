import PrivateService from '../core/PrivateService';
import SmartContractService from '../../src/eth/SmartContractService';
import tokens from '../../contracts/tokens';
import contracts from '../../contracts/contracts';
//var utils = require('ethers').utils;


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

    tubContract.onlognewcup = function(/*address, cdpIdBytes32*/) {
      //console.log('cup created, cdpId is: ', utils.bigNumberify(cdpIdBytes32).toString());
    };

    return tubContract.open().then((transaction) => {
      return ethersProvider.waitForTransaction(transaction.hash).then(function(transactionHash) {
        return transactionHash;
      });
    });
  }

// TODO: clean error-checking for tx failures.  Output the function call and the tx id of the failed tx
// treat all amounts as ether / full token values.

// put ETH collateral into a CDP
  lockEth(cdpId, amount) {
    _assignContracts();
    let wethContract = contract.getContractByName('weth');
    
    let amountBytes32 = utils.hexlify(amount); // or BigNumber
    
    // use wethContract's conversion 
    return wethContract.deposit(amount).then((transaction) => ethersProvider.waitForTransaction(transaction.hash))
      .then(tubContract.join(amountBytes32)) 
      .then((transaction) => ethersProvider.waitForTransaction(transaction.hash))
      .then(
        lockPeth(cdpId, amount)
      );
  }

// put WETH collateral into a CDP
  lockWeth(cdpId, amount) {
    _assignContracts();
    let wethContract = contract.getContractByName('weth');
    
    let amountBytes32 = utils.hexlify(amount);
    
    return tubContract.join(amountBytes32).then((transaction) => ethersProvider.waitForTransaction(transaction.hash))
      .then(
        lockPeth(cdpId, amount)
      );
}


  // lock PETH into a CDP
  lockPeth(cdpId, amount) {
    _assignContracts();

    let cdpIdBytes32 = utils.hexlify(cdpId);
    let amountBytes32 = utils.hexlify(amount);

    return tubContract.lock(cdpIdBytes32, amountBytes32).then((transaction) => ethersProvider.waitForTransaction(transaction.hash))
    .then(function(transactionHash) {
      return transactionHash;
  });
}

  // remove collateral from a CDP
  free(cdpId, amount){
    _assignContracts();
    
    let cdpIdBytes32 = utils.hexlify(cdpId);
    let amountBytes32 = utils.hexlify(amount);

    return tubContract.free(cdpIdBytes32, amountBytes32).then((transaction) => ethersProvider.waitForTransaction(transaction.hash))
    .then(function(transactionHash) {
      return transactionHash;
    });
  }

  // take Dai from a CDP and give to the wallet.  Needs to have locked collateral inside it.  
  draw(cdpId, amount){
    _assignContracts();
    
    let cdpIdBytes32 = utils.hexlify(cdpId);
    let amountBytes32 = utils.hexlify(amount);

    return tubContract.draw(cdpIdBytes32, amountBytes32).then((transaction) => ethersProvider.waitForTransaction(transaction.hash))
    .then(function(transactionHash) {
      return transactionHash;
    });
  }

  // send Dai to a CDP to cancel debt
  wipe(cdpId, amount){
    _assignContracts();
    
    let cdpIdBytes32 = utils.hexlify(cdpId);
    let amountBytes32 = utils.hexlify(amount);
    console.log('hexlify turns a 100 , a number, into: ', amountBytes32)

    return tubContract.wipe(cdpIdBytes32, ).then((transaction) => ethersProvider.waitForTransaction(transaction.hash))
    .then(function(transactionHash) {
      return transactionHash;
    });
  }

  // free all collateral and close a CDP
  shut(cdpId){
    _assignContracts();
    
    let cdpIdBytes32 = utils.hexlify(cdpId);

    return tubContract.shut(cdpIdBytes32).then((transaction) => ethersProvider.waitForTransaction(transaction.hash))
    .then(function(transactionHash) {
      return transactionHash;
    });
  }

  // transfer control of a CDP to a different address
  give(cdpId, address){
    _assignContracts();
    
    let cdpIdBytes32 = utils.hexlify(cdpId);
    console.log('hexlify turns \'1\' into: ', cdpIdBytes32);

    return tubContract.give(cdpIdBytes32, address).then((transaction) => ethersProvider.waitForTransaction(transaction.hash))
    .then(function(transactionHash) {
      return transactionHash;
    });
  }


  // can look for tx hash and/or events related to wallet address   
  _logEvent(eventTopic){
    this._provider.on([ eventTopic ], function(/*log*/) {
      //console.log('Event Log for: ', eventTopic);
      //console.log(log);
    });
  }

_assignContracts(){
  let contract = this.get('smartContract');
  let ethersProvider = contract.get('web3').ethersProvider();
  let tubContract = contract.getContractByName(contracts.TUB);
  }
}
