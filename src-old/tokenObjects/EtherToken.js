import Web3Service from '../web3/Web3Service';

export default class EtherToken {

  constructor(web3Service, gasEstimatorService) {
    this._web3 = web3Service;
    this._gasEstimator = gasEstimatorService;
  }

  allowance(tokenOwner, spender){ 
    return Promise.resolve(Number.MAX_SAFE_INTEGER); //double check that this should be a promise
  }

  balanceOf(owner){ //returns a promise
    return this._web3.eth.getBalance(owner); //add this as a passthrough to the web3service
  }

  balanceOfWithEthersJS(owner){
    var infuraKey = 'ihagQOzC3mkRXYuCivDN';
    var infuraProvider = new this._web3._ethers.providers.InfuraProvider('kovan', infuraKey);
    return infuraProvider.getBalance(owner);
  }

  approve(spender, value){
    return true;
  }

  approveUnlimited(spender){ 
    return true;
  }

  transfer(fromAddress, toAddress, transferValue){ //returns a promise
    const tx = {from: fromAddress, to: toAddress, amount: transferValue};
    this._gasEstimator.setPercentage(1.01);
    const gasLimit = this._gasEstimator.estimateGasLimit(tx);
    return this._web3.eth.sendTransaction({from: fromAddress, to: toAddress, value: transferValue, gasLimit: gasLimit, gasPrice: 300000});
  }

  transferWithEthersJS(toAddress, transferValue){
    const wallet = this._web3._ethersWallet;
    return wallet.send(toAddress, transferValue); //I believe you can add options here, such as gasLimit, gasPrice etc., per https://github.com/ethers-io/ethers.js/blob/master/wallet/wallet.js
  }
}