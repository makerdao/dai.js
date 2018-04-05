import { utils } from 'ethers';
import TransactionLifeCycle from '../exchanges/TransactionLifeCycle';
import transactionType from '../exchanges/TransactionTransitions';

export default class TransactionObject extends TransactionLifeCycle {
  constructor(transaction, ethersProvider) {
    super(transactionType.transaction);
    this._ethersProvider = ethersProvider;
    this._transaction = transaction;
    this._error = null;
    this._timeStampSubmitted = new Date(); //time that the transaction was submitted to the network.  should we also have a time for when it was accepted
    this._timeStampMined = null;
    this._getTransactionReceiptAndLogs();
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

  error() {
    return this._error;
  }

  state() {
    return this._transactionState;
  }

  _getTransactionReceiptAndLogs() {
    let gasPrice = null;
    this._transaction
      .then(
        tx => {
          //console.log('tx', tx);
          gasPrice = tx.gasPrice;
          super._pending();
          //go to pending state here, initially start off in initial state.  Figure out what exactly this means (is it sent, signed etc.)
          return this._ethersProvider.waitForTransaction(tx.hash);
        },
        // eslint-disable-next-line
        reason => {
          this._error = reason;
          super._error();
        }
      )
      .then(
        tx => {
          this._timeStampMined = new Date();
          super._mine();
          return this._ethersProvider.getTransactionReceipt(tx.hash);
        },
        reason => {
          this._error = reason;
          super._error();
        }
      )
      .then(
        receipt => {
          //console.log('filterResultsAndReceipt', filterResultsAndReceipt);
          this._fees = utils.formatEther(receipt.gasUsed.mul(gasPrice));
          this._mine();
        },
        reason => {
          this._error = reason;
          super._error();
        }
      );
    //after a certain number of blocks, call this._finalize
  }
}
