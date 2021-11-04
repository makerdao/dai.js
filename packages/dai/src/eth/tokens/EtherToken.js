import { getCurrency, ETH } from '../Currency';
import tracksTransactions from '../../utils/tracksTransactions';
import { ethers } from 'ethers';

export default class EtherToken {
  constructor(web3Service, gasService, transactionManager) {
    this._web3 = web3Service;
    this._gasService = gasService;
    this._transactionManager = transactionManager;
  }

  // eslint-disable-next-line
  allowance(tokenOwner, spender) {
    return Promise.resolve(Number.MAX_SAFE_INTEGER);
  }

  balance() {
    return this.balanceOf(this._web3.currentAddress());
  }

  async balanceOf(owner) {
    return ETH.wei(await this._web3.getBalance(owner));
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
      this._web3.currentAddress(),
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
        value: ethers.BigNumber.from(getCurrency(amount, unit).toFixed('wei'))
      },
      {
        metadata: {
          action: {
            name: 'transfer',
            from: fromAddress,
            to: toAddress,
            amount: ethers.BigNumber.from(
              getCurrency(amount, unit).toFixed('wei')
            )
          }
        },
        promise
      }
    );
  }
}
