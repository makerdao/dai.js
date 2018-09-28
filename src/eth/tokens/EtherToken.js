import { utils } from 'ethers';
import { getCurrency, ETH } from '../Currency';
import tracksTransactions from '../../utils/tracksTransactions';

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

  @tracksTransactions
  async transfer(toAddress, amount, { unit = ETH, promise }) {
    return this._transactionManager.sendTx(
      {
        from: this._web3.currentAccount(),
        to: toAddress,
        value: getCurrency(amount, unit)
          .toEthersBigNumber('wei')
          .toString()
      },
      { promise }
    );
  }

  @tracksTransactions
  async transferFrom(fromAddress, toAddress, transferValue, { promise }) {
    return this._transactionManager.sendTx(
      {
        from: fromAddress,
        to: toAddress,
        value: utils.parseEther(transferValue).toString()
      },
      { promise }
    );
  }
}
