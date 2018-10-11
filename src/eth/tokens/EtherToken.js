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
      .then(b => ETH(utils.formatEther(b)));
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
  async transfer(toAddress, amount, options) {
    return this.transferFrom(
      this._web3.currentAccount(),
      toAddress,
      amount,
      options
    );
  }

  @tracksTransactions
  async transferFrom(fromAddress, toAddress, amount, { unit = ETH, promise }) {
    return this._transactionManager.sendTransaction(
      {
        from: fromAddress,
        to: toAddress,
        value: getCurrency(amount, unit)
          .toEthersBigNumber('wei')
          .toString()
      },
      { promise }
    );
  }
}
