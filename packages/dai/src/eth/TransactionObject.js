import { promiseWait } from '../utils';
import TransactionLifeCycle from '../eth/TransactionLifeCycle';
import debug from 'debug';
import { ETH } from './Currency';

const log = debug('dai:TransactionObject');

export default class TransactionObject extends TransactionLifeCycle {
  constructor(
    transaction,
    transactionManager,
    { businessObject, metadata } = {}
  ) {
    super(businessObject);
    this._transaction = transaction;
    this._web3Service = transactionManager.get('web3');
    this._nonceService = transactionManager.get('nonce');
    this._timeStampSubmitted = new Date();
    this.metadata = metadata || {};
    this._confirmedBlockCount = this._web3Service.confirmedBlockCount();
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

  mine() {
    if (!this._dataPromise) this._dataPromise = this._getTransactionData();
    return this._dataPromise.then(() => this._returnValue());
  }

  isFinalized() {
    if (
      this._blockNumberWhenMined + this._confirmedBlockCount <=
      this._web3Service.blockNumber()
    )
      this.setFinalized();
    return super.isFinalized();
  }

  async confirm(count = this._confirmedBlockCount) {
    this._confirmedBlockCount = count;
    await this.mine();
    if (parseInt(count) <= 0) return;
    const newBlockNumber = this.receipt.blockNumber + count;
    await this._web3Service.waitForBlockNumber(newBlockNumber);
    const newReceipt = await this._web3Service.getTransactionReceipt(this.hash);
    if (newReceipt.blockHash !== this.receipt.blockHash) {
      throw new Error('transaction block hash changed');
    }
    this.setFinalized();
    return this._returnValue();
  }

  async _getTransactionData() {
    try {
      let gasPrice, tx;
      this.hash = await this._transaction;
      if (this.hash.hash) {
        // When using websockets, the transaction hash is returned from this._transaction
        // Otherwise, the tx receipt is returned. This corrects in such cases
        this.hash = this.hash.hash;
      }
      this.setPending(); // set state to pending

      // when you're on a local testnet, the transaction will probably already
      // be mined by this point. but on other nets, you still have to wait for
      // it to be mined.
      if (!tx || !tx.blockHash) {
        tx = await this._keepWaitingForTx();
      }

      gasPrice = tx.gasPrice;
      this._timeStampMined = new Date();
      this._blockNumberWhenMined = tx.blockNumber;
      this.receipt = await this._waitForReceipt();
      if (!!this.receipt.gasUsed && !!gasPrice) {
        this._fees = ETH.wei(gasPrice).times(this.receipt.gasUsed);
      } else {
        /*
          console.warn('Unable to calculate transaction fee. Gas usage or price is unavailable. Usage = ',
            receipt.gasUsed ? receipt.gasUsed.toString() : '<not set>',
            'Price = ', gasPrice ? gasPrice.toString() : '<not set>'
          );
        */
      }
      if (this.receipt.status == '0x1' || this.receipt.status == 1) {
        this.setMined();
      } else {
        const label = this.metadata.contract
          ? `${this.metadata.contract}.${this.metadata.method}`
          : 'transaction';
        const revertMsg = `${label} ${this.hash} reverted`;
        log(revertMsg + '\n' + JSON.stringify(this.receipt, null, '  '));
        throw new Error(revertMsg);
      }
    } catch (err) {
      await this._nonceService.setCounts();
      this.setError(err);
      throw err;
    }
    return this;
  }

  _waitForReceipt(retries = 15, currentTry = 1) {
    const result = Promise.resolve(
      this._web3Service.getTransactionReceipt(this.hash)
    );

    if (retries < 1) return result;
    return result.then(receipt => {
      if (receipt) return receipt;

      log(`Receipt is null. Retrying ${retries} more time(s)`);
      return promiseWait(currentTry * 1500).then(() =>
        this._waitForReceipt(retries - 1, currentTry + 1)
      );
    });
  }

  async _keepWaitingForTx() {
    let tx;
    const startTime = new Date();
    log(`waiting for transaction ${this.hash.substring(8)}... to mine`);
    for (let i = 0; i < 720; i++) {
      // 1 hour max
      tx = await this._web3Service.getTransaction(this.hash);
      if ((tx || {}).blockHash) break;
      log('not mined yet');
      await promiseWait(5000);
    }

    if (tx && !tx.blockHash) {
      throw new Error(
        'This transaction is taking longer than it should. Check its status on etherscan or try again. Tx hash:',
        this.hash
      );
    }

    const elapsed = (new Date() - startTime) / 1000;
    log(`mined ${this.hash.substring(8)}... done in ${elapsed}s`);
    return tx;
  }
}
