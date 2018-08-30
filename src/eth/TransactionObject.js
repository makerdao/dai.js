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
    businessObject = null,
    logsParser = logs => logs
  ) {
    super(businessObject);
    this._transaction = transaction;
    this._web3Service = web3Service;
    this._nonceService = nonceService;
    this._ethersProvider = web3Service.ethersProvider();
    this._logsParser = logsParser;
    this._timeStampSubmitted = new Date();
    this._timeStampMined = null;
    this._errorMessage = null;
    this._fees = null;
    this._logs = null;
    this._hash = null;
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

  async mine() {
    if (!this._dataPromise) this._dataPromise = this._getTransactionData();
    await this._dataPromise;
    return this;
  }

  async confirm(count = 3) {
    await this.mine();

    const newBlockNumber = this._receipt.blockNumber + count;
    await this._web3Service.waitForBlockNumber(newBlockNumber);
    const newReceipt = await this._ethersProvider.getTransactionReceipt(
      this._hash
    );
    if (newReceipt.blockHash !== this._receipt.blockHash) {
      throw new Error('transaction block hash changed');
    }
    this.setFinalized();
  }

  async _getTransactionData() {
    try {
      let gasPrice = null;
      let tx = await this._transaction;
      this._hash = tx.hash;
      this.setPending(); // set state to pending

      // when you're on a local testnet, a single call to getTransaction should
      // be enough. but on a remote net, it may take multiple calls.
      for (let i = 0; i < 10; i++) {
        tx = await this._ethersProvider.getTransaction(this._hash);
        if (tx) break;
        await promiseWait(1500);
      }

      if (!tx) {
        throw new Error('Tried getTransaction 10 times and still failed');
      }

      // when you're on a local testnet, the transaction will probably already
      // be mined by this point. but on other nets, you still have to wait for
      // it to be mined.
      if (!tx.blockHash) {
        const startTime = new Date();
        log(`waitForTransaction ${this._hash}`);
        tx = await this._ethersProvider.waitForTransaction(this._hash);
        const elapsed = (new Date() - startTime) / 1000;
        log(`waitForTransaction ${this._hash} done in ${elapsed}s`);
      }

      gasPrice = tx.gasPrice;
      this._timeStampMined = new Date();
      const receipt = (this._receipt = await this._waitForReceipt());

      if (typeof this._logsParser === 'function') {
        this._logsParser(receipt.logs);
      }

      if (!!receipt.gasUsed && !!gasPrice) {
        this._fees = ETH.wei(receipt.gasUsed.mul(gasPrice));
      } else {
        /*
          console.warn('Unable to calculate transaction fee. Gas usage or price is unavailable. Usage = ',
            receipt.gasUsed ? receipt.gasUsed.toString() : '<not set>',
            'Price = ', gasPrice ? gasPrice.toString() : '<not set>'
          );
        */
      }
      this.setMined();
    } catch (err) {
      this._errorMessage = err.message;
      console.error(err);
      await this._nonceService.setCounts();
      this.setError(err);
    }
    return this;
  }

  _waitForReceipt(retries = 5) {
    const result = Promise.resolve(
      this._ethersProvider.getTransactionReceipt(this._hash)
    );

    if (retries < 1) return result;
    return result.then(receipt => {
      if (receipt) return receipt;

      // console.warn(`Receipt is null. Retrying ${retries} more time(s)`);
      return promiseWait((6 - retries) * 1500).then(() =>
        this._waitForReceipt(retries - 1)
      );
    });
  }
}
