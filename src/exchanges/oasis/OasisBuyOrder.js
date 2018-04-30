import TransactionObject from '../../eth/TransactionObject';
import { utils } from 'ethers';

export default class OasisBuyOrder extends TransactionObject {
  constructor(transaction, web3Service) {
    super(transaction, web3Service, null, receiptLogs => {
      const receiptEvents = receiptLogs.filter(
        e =>
          e.topics[0] ===
            '0x819e390338feffe95e2de57172d6faf337853dfd15c7a09a32d76f7fd2443875' &&
          e.address === '0x8cf1Cab422A0b6b554077A361f8419cDf122a9F9'
      );
      let total = 0;
      receiptEvents.forEach(event => {
        total += parseInt(event.data.substring(66, 130), 16); //search for a more understandable way to parse logs
      });
      this._fillAmount = utils.formatEther(total.toString());
    });
  }

  fillAmount() {
    return this._fillAmount;
  }
}
