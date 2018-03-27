import PrivateService from '../core/PrivateService';
import SmartContractService from '../../src/eth/SmartContractService';
import tokens from '../../contracts/tokens';
import contracts from '../../contracts/contracts';



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
    var cdpCreatedId = null;
    var contract = this.get('smartContract');
    var ethersProvider = contract.get('web3').ethersProvider();     
    var tubContract = contract.getContractByName(contracts.TUB);
    var ethersUtils = contract.get('web3').ethersUtils();

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
    var contract = this.get('smartContract');     
    var ethersProvider = contract.get('web3').ethersProvider();     
    var tubContract = contract.getContractByName(contracts.TUB);
    var ethersUtils = contract.get('web3').ethersUtils();
    let wethContract = contract.getContractByName('WETH');
    console.log('weth', wethContract);
    
    let amountBytes32 = contract.stringToBytes32(amount); // or BigNumber
    console.log('amount is: ', amountBytes32);
    
    return wethContract.deposit().then((transaction) => ethersProvider.waitForTransaction(transaction.hash))
      .then(tubContract.join(amountBytes32)) 
      .then((transaction) => ethersProvider.waitForTransaction(transaction.hash))
      .then(
        this.lockPeth(cdpId, amount)
      ); 
  }

  // put WETH collateral into a CDP
  lockWeth(cdpId, amount) {
    var contract = this.get('smartContract');     
    var ethersProvider = contract.get('web3').ethersProvider();     
    var tubContract = contract.getContractByName(contracts.TUB);
    var ethersUtils = contract.get('web3').ethersUtils();

    
    let amountBytes32 = ethersUtils.hexlify(amount);
    
    return tubContract.join(amountBytes32).then((transaction) => ethersProvider.waitForTransaction(transaction.hash))
      .then(
        this.lockPeth(cdpId, amount)
      );
  }


  // lock PETH into a CDP
  lockPeth(cdpId, amount) {
    var contract = this.get('smartContract');     
    var ethersProvider = contract.get('web3').ethersProvider();     
    var tubContract = contract.getContractByName(contracts.TUB);
    var ethersUtils = contract.get('web3').ethersUtils();


    let cdpIdBytes32 = ethersUtils.hexlify(cdpId);
    console.log('cdpId hexlified is: ', cdpIdBytes32);
    let amountBytes32 = ethersUtils.hexlify(amount);
    console.log('amount hexlified is: ', amountBytes32);

    return tubContract.lock(cdpIdBytes32, amountBytes32).then((transaction) => {
      return ethersProvider.waitForTransaction(transaction.hash).then(function(transactionHash) {
        return transactionHash;
      });
    });
  }

  // remove collateral from a CDP
  free(cdpId, amount){
    var contract = this.get('smartContract');     
    var ethersProvider = contract.get('web3').ethersProvider();     
    var tubContract = contract.getContractByName(contracts.TUB);
    var ethersUtils = contract.get('web3').ethersUtils();

    
    let cdpIdBytes32 = ethersUtils.hexlify(cdpId);
    let amountBytes32 = ethersUtils.hexlify(amount);

    return tubContract.free(cdpIdBytes32, amountBytes32).then((transaction) => {
      return ethersProvider.waitForTransaction(transaction.hash).then(function(transactionHash) {
        return transactionHash;
        });
      });
  }

  // take Dai from a CDP and give to the wallet.  Needs to have locked collateral inside it.  
  draw(cdpId, amount){
    
    var contract = this.get('smartContract');     
    var ethersProvider = contract.get('web3').ethersProvider();     
    var tubContract = contract.getContractByName(contracts.TUB);
    var ethersUtils = contract.get('web3').ethersUtils();

    
    let cdpIdBytes32 = ethersUtils.hexlify(cdpId);
    let amountBytes32 = ethersUtils.hexlify(amount);

    return tubContract.draw(cdpIdBytes32, amountBytes32).then((transaction) => {
      return ethersProvider.waitForTransaction(transaction.hash).then(function(transactionHash) {
        return transactionHash;
        });
      });
  }

  // send Dai to a CDP to cancel debt
  wipe(cdpId, amount){
    var contract = this.get('smartContract');     
    var ethersProvider = contract.get('web3').ethersProvider();     
    var tubContract = contract.getContractByName(contracts.TUB);
    var ethersUtils = contract.get('web3').ethersUtils();

    
    let cdpIdBytes32 = contract.stringToBytes32(cdpId);
    let amountBytes32 = contract.stringToBytes32(amount);

    return tubContract.wipe(cdpIdBytes32, amountBytes32).then((transaction) => {
      return ethersProvider.waitForTransaction(transaction.hash).then(function(transactionHash) {
        return transactionHash;
        });
      });
  }

  // free all collateral and close a CDP
  shut(cdpId){
    if (cdpId == null || typeof cdpId == 'undefined') {
      return new Error('cdpId is null or undefined');
    }

    console.log('cdpId inside is:', cdpId);
    var contract = this.get('smartContract');     
    var ethersProvider = contract.get('web3').ethersProvider();    // redeclare?  
    var tubContract = contract.getContractByName(contracts.TUB);
    var ethersUtils = contract.get('web3').ethersUtils();

    let cdpIdBN = ethersUtils.bigNumberify(35);
    let cdpHex = ethersUtils.hexlify(cdpIdBN);
    console.log(cdpHex);

    var estimatePromise = tubContract.estimate.shut(cdpHex);
    return estimatePromise.then(function(gasCost) {
    // gasCost is returned as BigNumber
    console.log('Estimated Gas Cost: ' + gasCost.toString());
    });
    console.log('hit');
    
/*     return tubContract.shut(cdpIdBN).then((transaction) => {
      return ethersProvider.waitForTransaction(transaction.hash).then(function(transactionHash) {
        console.log('shutting cup: ', cdpIdBN.toString());
        return transactionHash;
        }); 
      });    */
  }

  // transfer control of a CDP to a different address
  give(cdpId, address){
    var contract = this.get('smartContract');     
    var ethersProvider = contract.get('web3').ethersProvider();     
    var tubContract = contract.getContractByName(contracts.TUB);
    var ethersUtils = contract.get('web3').ethersUtils();

    let cdpIdBytes32 = contract.stringToBytes32(cdpId);

    return tubContract.give(cdpIdBytes32, address).then((transaction) => {
      return ethersProvider.waitForTransaction(transaction.hash).then(function(transactionHash) {
        return transactionHash;
        });
      });
  }


  // can look for tx hash and/or events related to wallet address   
  _logEvent(eventTopic){
    this._provider.on([ eventTopic ], function(/*log*/) {
      //console.log('Event Log for: ', eventTopic);
      //console.log(log);
    });
  }

  _contractFactory() {
    var contract = this.get('smartContract');     
    var ethersProvider = contract.get('web3').ethersProvider();     
    var tubContract = contract.getContractByName(contracts.TUB);
    var ethersUtils = contract.get('web3').ethersUtils();
    
    let contractObj =
      [ contract, ethersProvider, ethersUtils, tubContract ];
    
    return contractObj;
  }
}
