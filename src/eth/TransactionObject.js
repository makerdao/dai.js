import { utils } from 'ethers';
import TransactionLifeCycle from '../eth/TransactionLifeCycle';

export default class TransactionObject extends TransactionLifeCycle {
  constructor(
    transaction,
    ethersProvider,
    businessObject = null,
    logsParser = logs => logs
  ) {
    super(businessObject);
    this._transaction = transaction;
    this._ethersProvider = ethersProvider;
    this._logsParser = logsParser;
    this._timeStampSubmitted = new Date();
    this._timeStampMined = null;
    this._error = null;
    this._fees = null;
    this._logs = null;
    this._hash = null;
    this._getTransactionData();
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

  logs() {
    return this._logs;
  }

  error() {
    return this._error;
  }

  _getTransactionData() {
    let gasPrice = null;
    this._transaction
      .then(
        tx => {
          super._pending(); //set state to pending
          this._hash = tx.hash;
          return this._ethersProvider.waitForTransaction(this._hash);
        },
        // eslint-disable-next-line
        reason => {
          this._error = reason;
          super._error();
        }
      )
      .then(
        tx => {
          gasPrice = tx.gasPrice;
          this._timeStampMined = new Date();
          return this._ethersProvider.getTransactionReceipt(this._hash);
        },
        reason => {
          this._error = reason;
          super._error();
        }
      )
      .then(
        receipt => {
          this._logs = this._logsParser(receipt.logs);
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

          const callback = currentBlockNumber => {
            if (currentBlockNumber >= receipt.blockNumber + 1) {
              //arbitrary number, in practice should probably be closer to 5-15 blocks
              this._ethersProvider.getTransactionReceipt(this._hash).then(
                receiptCheck => {
                  if (receiptCheck.blockHash === receipt.blockHash) {
                    super._finalize(); //set state to finalized
                  } else {
                    this._ethersProvider.once('block', callback);
                  }
                },
                () => {
                  this._ethersProvider.once('block', callback);
                }
              );
            } else {
              this._ethersProvider.once('block', callback);
            }
          };
          //this._ethersProvider.once('block', callback);
        },
        reason => {
          this._error = reason;
          super._error();
        }
      );
  }
}
