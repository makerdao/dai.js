/*eslint no-console: ['error', { 'allow': ['error'] }] */
import '../polyfills';
import { utils } from 'ethers';
import TransactionLifeCycle from '../eth/TransactionLifeCycle';

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
    this._getTransactionData();
    this._self = this;
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

  /*
  _waitForConfirmations(originalBlockNumber, originalBlockHash, requiredConfirmations = 3){

    let assertBlockHashUnchanged = newBlockNumber => {
      if (newBlockNumber < originalBlockNumber + requiredConfirmations) {
        console.log('reregistering handler: newBlockNumber: ', newBlockNumber, ' is lower than required blockNumber: ', originalBlockNumber + requiredConfirmations);
        this._ethersProvider.once('block', b=>{console.log(b)});
      } else {
        console.log('required block number ', originalBlockNumber + requiredConfirmations, ' reached, refreshing transaction receipt', this._hash);
        this._ethersProvider.getTransactionReceipt(this._hash).then(
          newReceipt => {
            if (newReceipt.blockHash === originalBlockHash) {
              this._finalize(); //set state to finalized
            } else {
              this._errorMessage = "transaction block hash changed";
              console.error(reason);
            }
          },
          reason => {
            this._errorMessage = reason;
            console.error(reason);
          }
        );
      }
    };
    console.log('registering handler.  original block number: ', originalBlockNumber, ' required block number: ', originalBlockNumber + requiredConfirmations);
    this._ethersProvider.once('block', assertBlockHashUnchanged);
  }
  */

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

  _getTransactionData() {
    let gasPrice = null;
    let transactionPromise;
    return this._transaction
      .then(tx => {
        this._pending(); //set state to pending
        this._hash = tx.hash;
        return Promise.any([
          this._ethersProvider.getTransaction(this._hash),
          this._ethersProvider.waitForTransaction(this._hash)
        ])
          .then(result => (transactionPromise = result))
          .then(() => {
            if (transactionPromise === null) {
              this._ethersProvider
                .getTransaction(this._hash)
                .then(result => (transactionPromise = result));
            }

            return transactionPromise;
          });
      })
      .then(tx => {
        gasPrice = tx.gasPrice;
        this._timeStampMined = new Date();
        return this._waitForReceipt();
      })
      .then(receipt => {
        //console.log('receiptGasUsed', receipt.gasUsed.toString());
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
        this._mine(); //set state to mined

        //this._waitForConfirmations(receipt.blockNumber, receipt.blockHash);
        const requiredConfirmations = 3;
        this._web3Service.waitForBlockNumber(
          receipt.blockNumber + requiredConfirmations,
          () => {
            this._assertBlockHashUnchanged(receipt.blockHash);
          }
        );
      })
      .catch(reason => {
        this._errorMessage = reason;
        this._error();
        console.error(reason);
      });
  }

  _waitForReceipt(retries = 5) {
    const result = Promise.resolve(
      this._ethersProvider.getTransactionReceipt(this._hash)
    );
    return retries < 1
      ? result
      : result.then(receipt => {
          if (!receipt) {
            // eslint-disable-next-line
            console.warn(
              'Receipt is null. Retrying ' + retries + ' more time(s)'
            );
            return new Promise(resolve =>
              setTimeout(() => resolve(), (6 - retries) * 1500)
            ).then(() => this._waitForReceipt(retries - 1));
          }

          return receipt;
        });
  }
}
