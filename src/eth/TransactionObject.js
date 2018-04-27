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
              this._error = "transaction block hash changed";
              this._error();
            }
          },
          reason => {
            this._error = reason;
            this._error();
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
          this._error = 'transaction block hash changed';
          this._error();
        }
      },
      reason => {
        this._error = reason;
        this._error();
      }
    );
  }

  _getTransactionData() {
    let gasPrice = null;
    let txHash = null;
    this._transaction
      .then(
        tx => {
          // console.log(tx);
          gasPrice = tx.gasPrice;
          super._pending();
          //go to pending state here, initially start off in initial state.  Figure out what exactly this means (is it sent, signed etc.)
          return this._ethersProvider.waitForTransaction(tx.hash);
        },
        // eslint-disable-next-line
        reason => {
          // console.log('error waiting for initial tx to return', reason);
          this._error = reason;
          this._error();
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
          this._error();
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

          //this._waitForConfirmations(receipt.blockNumber, receipt.blockHash);
          const requiredConfirmations = 3;
          //console.log('originalBlockNumber:', receipt.blockNumber);
          this._web3Service.waitForBlockNumber(
            receipt.blockNumber + requiredConfirmations,
            () => {
              this._assertBlockHashUnchanged(receipt.blockHash);
            }
          );
        },
        reason => {
          this._error = reason;
          this._error();
        }
      );
  }
}
