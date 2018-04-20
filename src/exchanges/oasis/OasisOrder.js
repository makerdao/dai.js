// import OasisExchangeService from './OasisExchangeService';
import orderStyle from '../orderStyle';
import { utils } from 'ethers';
import TransactionLifeCycle from '../TransactionLifeCycle';

export default class OasisOrder extends TransactionLifeCycle {
  constructor(transaction, ethersProvider) {
    super();
    this._ethersProvider = ethersProvider;
    this._transaction = transaction;
    this._fillAmount = null;
    this._fees = null;
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

  type() {
    return orderStyle.market; //create enum for this
  }

  fillAmount() {
    return this._fillAmount;
  }

  error() {
    return this._error;
  }

  _getTransactionReceiptAndLogs() {
    let resolvedTransaction = null;
    let gasPrice = null;
    this._transaction
      .then(
        tx => {
          //console.log('tx in OasisOrder', tx);
          resolvedTransaction = tx;
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
          //console.log('tx in OasisOrder after waiting', tx);
          this._timeStampMined = new Date();
          //console.log('txHash after mined', tx);
          const filter = {
            fromBlock: tx.blockNumber,
            toBlock: tx.blockNumber,
            //address: '0xd0a1e359811322d97fi991e03f863a0c30c2cf029c', kovan weth
            address: '0x8cf1Cab422A0b6b554077A361f8419cDf122a9F9', //kovan oasis
            //topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'] //hash of Transfer(...)
            topics: [
              '0x819e390338feffe95e2de57172d6faf337853dfd15c7a09a32d76f7fd2443875'
            ] //hash of LogTrade(..)
            //topics: ['0x3383e3357c77fd2e3a4b30deea81179bc70a795d053d14d5b7f2f01d0fd4596f'] //hash of LogTake(...)
          };
          return Promise.all([
            this._ethersProvider.getLogs(filter),
            this._ethersProvider.getTransactionReceipt(tx.hash)
          ]);
        },
        reason => {
          this._error = reason;
          super._error();
        }
      )
      .then(
        filterResultsAndReceipt => {
          //console.log('receipt', filterResultsAndReceipt[1]);
          //console.log('transaction.hash', resolvedTransaction.hash);
          this._fees = utils.formatEther(
            filterResultsAndReceipt[1].gasUsed.mul(gasPrice)
          );
          //console.log('receipt logs: ', filterResultsAndReceipt[1].logs);
          //const receiptLogs = filterResultsAndReceipt[1].logs;
          //const receiptEvents = receiptLogs.filter()
          //console.log('this._fees', this._fees);
          const events = filterResultsAndReceipt[0].filter(
            t => t.transactionHash === resolvedTransaction.hash
          ); //there could be several of these
          let total = 0;
          events.forEach(event => {
            //console.log('event: ', event);
            //console.log('amount of token received: ', event.data.substring(2,66));
            total += parseInt(event.data.substring(2, 66), 16);
          });
          this._fillAmount = utils.formatEther(total.toString());
          super._mine();
          const callback = currentBlockNumber => {
            if (
              currentBlockNumber >=
              filterResultsAndReceipt[1].blockNumber + 1
            ) {
              //arbitrary number, in practice should probably be closer to 5-15 blocks
              this._ethersProvider
                .getTransactionReceipt(resolvedTransaction.hash)
                .then(
                  receiptCheck => {
                    if (
                      receiptCheck.blockHash ===
                      filterResultsAndReceipt[1].blockHash
                    ) {
                      super._finalize();
                    } else {
                      this._ethersProvider.once('block', callback);
                    }
                  },
                  () => {
                    //error calling getTransactionReceipt
                    this._ethersProvider.once('block', callback);
                  }
                );
            } else {
              this._ethersProvider.once('block', callback);
            }
          };
          //this._ethersProvider.once('block', callback);
          //console.log('this._fillAmount', this._fillAmount);
        },
        reason => {
          this._error = reason;
          super._error();
        }
      );
  }
}
