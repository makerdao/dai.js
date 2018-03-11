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

  transfer(fromAddress, toAddress, transferValue){
    return this._web3.eth.sendTransaction({
      from: fromAddress,
      to: toAddress,
      value: transferValue
    });
  }
}