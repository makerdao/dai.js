import { utils } from 'ethers';
import TransactionLifeCycle from '../exchanges/TransactionLifeCycle';
import transactionType from '../exchanges/TransactionTransitions';
import Cdp from './Cdp';
import getNewCdpId from '../utils/getNewCdpId';

export default class TransactionObject extends TransactionLifeCycle {
  constructor(
    transaction,
    ethersProvider,
    businessObject = null,
    service = null
  ) {
    super(transactionType.transaction, businessObject);
    this._ethersProvider = ethersProvider;
    this._transaction = transaction;
    this._error = null;
    this._timeStampSubmitted = new Date(); //time that the transaction was submitted to the network.  should we also have a time for when it was accepted
    this._timeStampMined = null;
    this._businessObject = businessObject;
    this._service = service;
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

  error() {
    return this._error;
  }

  _getTransactionReceipt() {
    let gasPrice = null;
    this._transaction
      .then(
        tx => {
          gasPrice = tx.gasPrice;
          super._pending();
          //go to pending state here, initially start off in initial state.  Figure out what exactly this means (is it sent, signed etc.)
          return this._ethersProvider.waitForTransaction(tx.hash);
        },
        reason => {
          // eslint-disable-next-line
          console.log('error waiting for initial tx to return', reason);
          this._error = reason;
          super._error();
        }
      )
      .then(
        tx => {
          //console.log('tx after waiting:', tx);
          //console.log('tx.hash after waiting:', tx.hash);
          txHash = tx.hash;
          this._timeStampMined = new Date();
          this._mine(); //remove this
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
          if (receipt) {
            //console.log('filterResultsAndReceipt', filterResultsAndReceipt);
            this._fees = utils.formatEther(receipt.gasUsed.mul(gasPrice));
          }

          if (this._businessObject === 'cdp') {
            getNewCdpId(this._service).then(id => {
              this._mine();
              return new Cdp(this._service, id);
            });
          }

          this._mine();
        },
        reason => {
          // eslint-disable-next-line
          console.log('error getting tx receipt', reason);
          this._error = reason;
          super._error();
        }
      );
  }
}
