export default class EtherToken {
  constructor(web3Service, gasEstimatorService) {
    this._web3 = web3Service;
    this._gasEstimator = gasEstimatorService;
  }

  // eslint-disable-next-line
  allowance(tokenOwner, spender) {
    return Promise.resolve(Number.MAX_SAFE_INTEGER);
  }

  balanceOf(owner) {
    return this._web3.ethersProvider().getBalance(owner);
  }

  // eslint-disable-next-line
  approve(spender, value) {
    return Promise.resolve(true);
  }

  // eslint-disable-next-line
  approveUnlimited(spender) {
    return Promise.resolve(true);
  }

  transfer(fromAddress, toAddress, transferValue) {
    return this._web3.eth.sendTransaction({
      from: fromAddress,
      to: toAddress,
      value: transferValue
    });
  }
}
