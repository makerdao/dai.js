import TransactionObject from '../TransactionObject';
const utils = require('ethers').utils;

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
    return this._web3
      .ethersProvider()
      .getBalance(owner)
      .then(b => utils.formatEther(b));
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
    const valueInWei = utils.parseEther(transferValue);
    //todo,change from a web3 call to a ethersJS call?
    return new TransactionObject(
      this._web3.eth.sendTransaction({
        from: fromAddress,
        to: toAddress,
        value: valueInWei
      }),
      this._web3.ethersProvider()
    );
  }
}
