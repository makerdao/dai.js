import { utils } from 'ethers';
import { getCurrency, ETH } from '../Currency';

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

  transfer(toAddress, amount, unit = ETH) {
    const value = getCurrency(amount, unit)
      .toEthersBigNumber('wei')
      .toString();
    const currentAccount = this._web3.currentAccount();
    const tx = this._web3.eth.sendTransaction({
      from: currentAccount,
      to: toAddress,
      value
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
