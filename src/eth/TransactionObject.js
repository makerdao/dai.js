import '../polyfills';
import { promiseWait } from '../utils';
import { utils } from 'ethers';
import TransactionLifeCycle from '../eth/TransactionLifeCycle';
import debug from 'debug';

const log = debug('makerjs:transactionObject');

export default class TransactionObject extends TransactionLifeCycle {
  constructor(
    transaction,
    web3Service,
    businessObject = null,
    logsParser = logs => logs
  ) {
    super(businessObject);
    this._transaction = transaction;
    this._web3Service = web3Service;
    this._ethersProvider = web3Service.ethersProvider();
    this._logsParser = logsParser;
    this._timeStampSubmitted = new Date();
    this._timeStampMined = null;
    this._errorMessage = null;
    this._fees = null;
    this._logs = null;
    this._hash = null;
  }

  execute() {
    return this._getTransactionData().then(() => this);
  }

  timeStampSubmitted() {
    return this._timeStampSubmitted;
  }

  timeStamp() {
    return this._timeStampMined;
  }

  fees() {
    return this._fees;
  }

  hash() {
    return this._hash;
  }

  error() {
    return this._errorMessage;
  }

  _assertBlockHashUnchanged(originalBlockHash) {
    this._ethersProvider.getTransactionReceipt(this._hash).then(
      newReceipt => {
        if (newReceipt.blockHash === originalBlockHash) {
          this._finalize(); //set state to finalized
        } else {
          this._errorMessage = 'transaction block hash changed';
          this._error();
          console.error(this._errorMessage);
        }
      },
      reason => {
        this._errorMessage = reason;
        this._error();
        console.error(reason);
      }
    );
  }

  async _getTransactionData() {
    let gasPrice = null;
    let tx = await this._transaction;

    this._pending(); // set state to pending
    this._hash = tx.hash;

    // when you're on a local testnet, a single call to getTransaction should be
    // enough. but on a remote net, it may take multiple calls.
    const getWithRetry = () =>
      this._ethersProvider
        .getTransaction(this._hash)
        .then(tx => tx || promiseWait(500).then(getWithRetry));

    tx = await getWithRetry();

    // when you're on a local testnet, the transaction will probably already be
    // mined by this point. but on other nets, you still have to wait for it to
    // be mined.
    if (!tx.blockHash) {
      const startTime = new Date();
      log(`waitForTransaction ${this._hash}`);
      tx = await this._ethersProvider.waitForTransaction(this._hash);
      const elapsed = (new Date() - startTime) / 1000;
      log(`waitForTransaction ${this._hash} done in ${elapsed}s`);
    }

    gasPrice = tx.gasPrice;
    this._timeStampMined = new Date();
    const receipt = await this._waitForReceipt();

    if (typeof this._logsParser === 'function') {
      this._logsParser(receipt.logs);
    }

    if (!!receipt.gasUsed && !!gasPrice) {
      this._fees = utils.formatEther(receipt.gasUsed.mul(gasPrice));
    } else {
      /*
        console.warn('Unable to calculate transaction fee. Gas usage or price is unavailable. Usage = ',
          receipt.gasUsed ? receipt.gasUsed.toString() : '<not set>',
          'Price = ', gasPrice ? gasPrice.toString() : '<not set>'
        );
      */
    }
    this._mine(); // set state to mined

    const requiredConfirmations = 3;
    this._web3Service.waitForBlockNumber(
      receipt.blockNumber + requiredConfirmations,
      () => this._assertBlockHashUnchanged(receipt.blockHash)
    );
  }

  _waitForReceipt(retries = 5) {
    const result = Promise.resolve(
      this._ethersProvider.getTransactionReceipt(this._hash)
    );
    return retries < 1
      ? result
      : result.then(receipt => {
          if (receipt) return receipt;

          // console.warn(`Receipt is null. Retrying ${retries} more time(s)`);
          return promiseWait((6 - retries) * 1500).then(() =>
            this._waitForReceipt(retries - 1)
          );
        });
  }
}
