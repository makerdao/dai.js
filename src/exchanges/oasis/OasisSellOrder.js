import TransactionObject from '../../eth/TransactionObject';
import { utils } from 'ethers';

export default class OasisSellOrder extends TransactionObject {
  constructor(transaction, web3Service, oasisContract) {
    super(transaction, web3Service, null, receiptLogs => {
      const LogTradeEvent = oasisContract.interface.events.LogTrade;
      const LogTradeTopic = utils.keccak256(
        web3Service._web3.toHex(LogTradeEvent.signature)
      ); //find a way to convert string to hex without web3
      const receiptEvents = receiptLogs.filter(
        e =>
          e.topics[0] === LogTradeTopic && e.address === oasisContract.address
      );
      let total = utils.bigNumberify('0');
      receiptEvents.forEach(event => {
        const parsedLog = LogTradeEvent.parse(event.data);
        total = total.add(parsedLog.pay_amt);
      });
      this._fillAmount = utils.formatEther(total.toString());
    });
  }

  fillAmount() {
    return this._fillAmount;
  }
}
