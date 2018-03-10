export default class EtherToken {

  constructor(web3Service, gasEstimatorService) {
    this._web3 = web3Service;
    this._gasEstimator = gasEstimatorService;
  }

  allowance(tokenOwner, spender){ 
    return Promise.resolve(Number.MAX_SAFE_INTEGER);
  }

  balanceOf(owner){
    return this._web3.ethersProvider().getBalance(owner);
  }

  approve(spender, value){
    return Promise.resolve(true);
  }

  approveUnlimited(spender){ 
    return Promise.resolve(true);
  }

  transfer(fromAddress, toAddress, transferValue){ //returns a promise
    const tx = { from: fromAddress, to: toAddress, amount: transferValue };
    this._gasEstimator.setPercentage(1.01);
    const gasLimit = this._gasEstimator.estimateGasLimit(tx);
    return this._web3.eth.sendTransaction({from: fromAddress, to: toAddress, value: transferValue, gasLimit: gasLimit, gasPrice: 300000});
  }

  transferWithEthersJS(toAddress, transferValue){
    const wallet = this._web3._ethersWallet;
    return wallet.send(toAddress, transferValue); //I believe you can add options here, such as gasLimit, gasPrice etc., per https://github.com/ethers-io/ethers.js/blob/master/wallet/wallet.js
  }
}