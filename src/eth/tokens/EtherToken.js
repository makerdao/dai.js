import { utils } from 'ethers';

export default class EtherToken {
  constructor(web3Service, gasEstimatorService, transactionManager) {
    this._web3 = web3Service;
    this._gasEstimator = gasEstimatorService;
    this._transactionManager = transactionManager;
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
      //gasPrice: 500000000
    });

    return this._transactionManager.createHybridTx(
      tx.then(tx => ({ hash: tx }))
    );
  }

  transferFrom(fromAddress, toAddress, transferValue) {
    const valueInWei = utils.parseEther(transferValue).toString();
    const tx = this._web3.eth.sendTransaction({
      from: fromAddress,
      to: toAddress,
      value: valueInWei
    });

    return this._transactionManager.createHybridTx(
      tx.then(tx => ({ hash: tx }))
    );
  }
}
