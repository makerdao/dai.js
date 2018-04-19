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

  transfer(toAddress, transferValue) {
    const valueInWei = utils.parseEther(transferValue).toString();
    const defaultAccount = this._web3.defaultAccount();
    const tx = this._web3.eth.sendTransaction({
      from: defaultAccount,
      to: toAddress,
      value: valueInWei
    });
    /*return tx.then(TX=>{
      console.log('returnedTX', TX);
      return this._web3.ethersProvider().waitForTransaction(TX)
    })
    .then(tx=>{
      console.log('mined tx', tx);
    });*/
    return new TransactionObject(
      tx.then(tx => ({ hash: tx })),
      this._web3.ethersProvider(),
      null
    );
  }

  transferFrom(fromAddress, toAddress, transferValue) {
    const valueInWei = utils.parseEther(transferValue).toString();
    return new TransactionObject(
      this._web3.eth
        .sendTransaction({
          from: fromAddress,
          to: toAddress,
          value: valueInWei
        })
        .then(tx => ({ hash: tx })),
      this._web3.ethersProvider(),
      null
    );
  }
}
