import { utils } from 'ethers';
import TransactionLifeCycle from '../exchanges/TransactionLifeCycle';

export default class TransactionObject extends TransactionLifeCycle {
  constructor(
    transaction,
    ethersProvider,
    businessObject = null,
    logsParser = logs => logs
  ) {
    super(businessObject);
    this._ethersProvider = ethersProvider;
    this._transaction = transaction;
    this._error = null;
    this._timeStampSubmitted = new Date(); //time that the transaction was submitted to the network.  should we also have a time for when it was accepted
    this._timeStampMined = null;
    this._fees = null;
    this._logs = null;
    this._logsParser = logsParser;
    this._getTransactionReceipt();
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

  logs() {
    return this._logs;
  }

  error() {
    return this._error;
  }

  _getTransactionReceipt() {
    let gasPrice = null;
    let txHash = null;
    this._transaction
      .then(
        tx => {
          super._pending();
          //go to pending state here, initially start off in initial state.  Figure out what exactly this means (is it sent, signed etc.)
          return this._ethersProvider.waitForTransaction(tx.hash);
        },
        // eslint-disable-next-line
        reason => {
          //console.log('error waiting for initial tx to return', reason);
          this._error = reason;
          super._error();
        }
      )
      .then(
        tx => {
          gasPrice = tx.gasPrice;
          //console.log('tx.hash after waiting:', tx.hash);
          txHash = tx.hash;
          this._timeStampMined = new Date();
          //this._mine(); //remove this
          return this._ethersProvider.getTransactionReceipt(tx.hash);
        },
        reason => {
          //console.log('error calling waitForTransaction', reason);
          this._error = reason;
          super._error();
        }
      )
      .then(
        receipt => {
          //console.log(typeof receipt.gasUsed, typeof gasPrice);
          this._fees = utils.formatEther(receipt.gasUsed.mul(gasPrice));
          this._logs = this._logsParser(receipt.logs);
          this._mine();
          const callback = currentBlockNumber => {
            if (currentBlockNumber >= receipt.blockNumber + 1) {
              //arbitrary number, in practice should probably be closer to 5-15 blocks
              this._ethersProvider.getTransactionReceipt(txHash).then(
                receiptCheck => {
                  if (receiptCheck.blockHash === receipt.blockHash) {
                    //console.log('about to finalize');
                    super._finalize();
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
          //console.log('error getting tx receipt', reason);
          this._error = reason;
          super._error();
        }
      );
  }
}
