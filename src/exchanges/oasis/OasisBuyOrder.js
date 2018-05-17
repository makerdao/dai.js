import TransactionObject from '../../eth/TransactionObject';
import TransactionState from '../../eth/TransactionState';
import { utils } from 'ethers';

export default class OasisBuyOrder {

  static buildOasisBuyOrder(oasisContract, transaction, transactionService){
    const order = new OasisBuyOrder();
    return transactionService.createTransactionHybrid(transaction, order, TransactionState.mined, receiptLogs => {
      const LogTradeEvent = oasisContract.getInterface().events.LogTrade;
      const LogTradeTopic = utils.keccak256(
        transactionService.get('web3')._web3.toHex(LogTradeEvent.signature)
      ); //find a way to convert string to hex without web3
      const receiptEvents = receiptLogs.filter(
        e => {
          return e.topics[0].toLowerCase() === LogTradeTopic.toLowerCase() && e.address.toLowerCase() === oasisContract.getAddress().toLowerCase()
      });
      let total = utils.bigNumberify('0');
      receiptEvents.forEach(event => {
        const parsedLog = LogTradeEvent.parse(event.data);
        total = total.add(parsedLog.buy_amt);
      });
      order._fillAmount = utils.formatEther(total.toString());
    });
  }

  constructor(transaction, web3Service, oasisContract) {
    this._fillAmount = null;
  }

  fillAmount() {
    return this._fillAmount;
  }
}
