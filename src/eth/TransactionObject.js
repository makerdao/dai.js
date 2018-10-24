import { promiseWait } from '../utils';
import TransactionLifeCycle from '../eth/TransactionLifeCycle';
import debug from 'debug';
import { ETH } from './Currency';

const log = debug('dai:transactionObject');

export default class TransactionObject extends TransactionLifeCycle {
  constructor(
    transaction,
    web3Service,
    nonceService,
    { businessObject, metadata } = {}
  ) {
    super(businessObject);
    this._transaction = transaction;
    this._web3Service = web3Service;
    this._nonceService = nonceService;
    this._timeStampSubmitted = new Date();
    this.metadata = metadata;
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
    const newReceipt = await this._web3Service.getTransactionReceipt(
      this.hash
    );
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
      this.setPending(); // set state to pending

      // when you're on a local testnet, a single call to getTransaction should
      // be enough. but on a remote net, it may take multiple calls.
      for (let i = 0; i < 10; i++) {
        tx = await this._web3Service.getTransaction(this.hash);
        if (tx) break;
        log('no tx yet');
        await promiseWait(1500);
      }
      log('got tx:', tx);

      if (!tx) {
        throw new Error('Tried getTransaction 10 times and still failed');
      }

      // when you're on a local testnet, the transaction will probably already
      // be mined by this point. but on other nets, you still have to wait for
      // it to be mined.
      if (!tx.blockHash) {
        const startTime = new Date();
        log(`waiting for transaction ${this.hash.substring(8)}... to mine`);
        for (let i = 0; i < 240; i++) { // 20 minutes max
          tx = await this._web3Service.getTransaction(this.hash);
          if (tx.blockHash) break;
          log('not mined yet');
          await promiseWait(5000);
        }
        const elapsed = (new Date() - startTime) / 1000;
        log(`mined ${this.hash.substring(8)}... done in ${elapsed}s`);
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
        //transaction reverted
        const revertMsg = `transaction with hash ${this.hash} reverted`;
        log(revertMsg);
        throw new Error(revertMsg);
      }
    } catch (err) {
      await this._nonceService.setCounts();
      this.setError(err);
      throw err;
    }
    return this;
  }

  _waitForReceipt(retries = 5) {
    const result = Promise.resolve(
      this._web3Service.getTransactionReceipt(this.hash)
    );

    if (retries < 1) return result;
    return result.then(receipt => {
      if (receipt) return receipt;

      log(`Receipt is null. Retrying ${retries} more time(s)`);
      return promiseWait((6 - retries) * 1500).then(() =>
        this._waitForReceipt(retries - 1)
      );
    });
  }
}
