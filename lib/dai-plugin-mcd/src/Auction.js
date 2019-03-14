import { RAY } from './constants';
import BigNumber from 'bignumber.js';
import { getFlipContractNameForCurrency } from './utils';
import { MDAI } from './index';

export default class Auction {
  constructor(smartContractService, currency) {
    if (currency.symbol === MDAI.symbol)
      this.contract = smartContractService.getContract('MCD_FLAP');
    // surplus auction is auctioning off Dai
    else if (currency.symbol === 'MKR')
      this.contract = smartContractService.getContract('MCD_FLOP');
    // debt auction is auctioning off Mkr
    else
      this.contract = smartContractService.getContract(
        getFlipContractNameForCurrency(currency)
      );
  }

  // returns time in hours
  async getMaxBidLifetime() {
    return (await this.contract.ttl()) / 3600;
  }

  // returns time in days
  async getMaxAuctionDuration() {
    return (await this.contract.tau()) / 86400;
  }

  // returns decimal representation of minimum percentage increase
  async getMinBidIncrease() {
    const beg = await this.contract.beg();
    // the contract's BigNumber implementation (bn.js) doesn't support decimals,
    // so we use bignumber.js instead
    return new BigNumber(beg)
      .div(RAY)
      .minus(1)
      .toNumber();
  }
}
