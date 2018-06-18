import { utils } from 'ethers';

export default class OasisSellOrder {
  static buildOasisSellOrder(oasisContract, transaction, transactionService) {
    const order = new OasisSellOrder();
    order._hybrid = transactionService.createTransactionHybrid(
      transaction,
      order,
      receiptLogs => {
        const LogTradeEvent = oasisContract.getInterface().events.LogTrade;
        const LogTradeTopic = utils.keccak256(
          transactionService.get('web3')._web3.toHex(LogTradeEvent.signature)
        ); //find a way to convert string to hex without web3
        const receiptEvents = receiptLogs.filter(e => {
          return (
            e.topics[0].toLowerCase() === LogTradeTopic.toLowerCase() &&
            e.address.toLowerCase() === oasisContract.getAddress().toLowerCase()
          );
        });
        let total = utils.bigNumberify('0');
        receiptEvents.forEach(event => {
          const parsedLog = LogTradeEvent.parse(event.data);
          total = total.add(parsedLog.pay_amt);
        });
        order._fillAmount = utils.formatEther(total.toString());
      }
    );
    return order._hybrid;
  }

  constructor() {
    this._fillAmount = null;
    this._hybrid = null;
  }

  fillAmount() {
    return this._fillAmount;
  }

  fees() {
    return this._hybrid.getOriginalTransaction().fees();
  }

  created() {
    return this._hybrid.getOriginalTransaction().timestamp();
  }
}
