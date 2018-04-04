import { utils } from 'ethers';
import TransactionManager from '../exchanges/TransactionManager';

export default class TransactionObject extends TransactionLifecycle{
  constructor(transaction, ethersProvider) {
    super(/*regular transaction type*/, this);
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

  _getTransactionReceiptAndLogs(){
    let resolvedTransaction = null;
    let gasPrice = null;
    this._transaction
      .then(
        tx => {
          //console.log('tx', tx);
          resolvedTransaction = tx;
          gasPrice = tx.gasPrice;
          this._transactionState.pending();
          //go to pending state here, initially start off in initial state.  Figure out what exactly this means (is it sent, signed etc.)
          return this._ethersProvider.waitForTransaction(tx.hash);
        },
        // eslint-disable-next-line
        reason => {
          this._error = reason;
          this._transactionState.error();
        }
      )
      .then(tx => {
        this._timeStampMined = new Date();
        this._transactionState.confirm();
        return this._ethersProvider.getTransactionReceipt(tx.hash);
      }, reason => {
          this._error = reason;
          this._transactionState.error();
        })
      .then(receipt => {
        //console.log('filterResultsAndReceipt', filterResultsAndReceipt);
        //console.log('transaction.hash', resolvedTransaction.hash);
        this._fees = utils.formatEther(
          receipt.gasUsed.mul(gasPrice)
        );
        this._transactionState.complete();
      }, reason => {
          this._error = reason;
          this._transactionState.error();
        });
  }
}