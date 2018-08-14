import { utils } from 'ethers';
import { DAI } from '../../eth/Currency';

export default class OasisOrder {
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

  transact(oasisContract, transaction, transactionManager) {
    return transactionManager.createHybridTx(transaction, {
      businessObject: this,
      parseLogs: receiptLogs => {
        const LogTradeEvent = oasisContract.interface.events.LogTrade;
        const LogTradeTopic = utils.keccak256(
          transactionManager.get('web3')._web3.toHex(LogTradeEvent.signature)
        ); //find a way to convert string to hex without web3
        const receiptEvents = receiptLogs.filter(e => {
          return (
            e.topics[0].toLowerCase() === LogTradeTopic.toLowerCase() &&
            e.address.toLowerCase() === oasisContract.address.toLowerCase()
          );
        });
        let total = utils.bigNumberify('0');
        receiptEvents.forEach(event => {
          const parsedLog = LogTradeEvent.parse(event.data);
          total = total.add(parsedLog[this._logKey]);
        });
        this._fillAmount = this._unit.wei(total.toString());
      }
    });
  }
}

export class OasisBuyOrder extends OasisOrder {
  constructor() {
    super();
    this._logKey = 'buy_amt';
    this._unit = DAI;
  }

  static build(oasisContract, transaction, transactionManager) {
    const order = new OasisBuyOrder();
    order._hybrid = order.transact(
      oasisContract,
      transaction,
      transactionManager
    );
    return order._hybrid;
  }
}

export class OasisSellOrder extends OasisOrder {
  constructor(currency) {
    super();
    this._logKey = 'pay_amt';
    this._unit = currency;
  }

  static build(oasisContract, transaction, transactionManager, currency) {
    const order = new OasisSellOrder(currency);
    order._hybrid = order.transact(
      oasisContract,
      transaction,
      transactionManager
    );
    return order._hybrid;
  }
}
