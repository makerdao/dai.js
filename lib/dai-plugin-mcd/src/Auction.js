import { RAY } from '@makerdao/dai/utils/constants';
import BigNumber from 'bignumber.js';
import { getFlipContractNameForCurrency } from './utils';

export default class Auction {
  constructor(smartContractService, currency) {
    if (currency.symbol === 'DAI')
      this._auctionContract = smartContractService.getContract('MCD_FLAP');
    //surplus auction is auctioning off Dai
    else if (currency.symbol === 'MKR')
      this._auctionContract = smartContractService.getContract('MCD_FLOP');
    //debt auction is auctioning off Mkr
    else
      this._auctionContract = smartContractService.getContract(
        getFlipContractNameForCurrency(currency)
      );
  }

  //returns time in hours
  async getMaxBidLifetime() {
    const ttl = await this._auctionContract.ttl();
    const secondsInHour = 60 * 60;
    return new BigNumber(ttl.toString()).dividedBy(secondsInHour).toNumber();
  }

  //returns time in days
  async getMaxAuctionDuration() {
    const tau = await this._auctionContract.tau();
    const secondsInDay = 60 * 60 * 24;
    return new BigNumber(tau.toString()).dividedBy(secondsInDay).toNumber();
  }

  //returns decimal representation of minimum percentage increase
  async getMinBidIncrease() {
    const beg = await this._auctionContract.beg();
    return new BigNumber(beg.toString())
      .dividedBy(RAY)
      .minus(1)
      .toNumber();
  }
}
