import { WAD } from './constants';
import BigNumber from 'bignumber.js';
import { MDAI } from './index';

export default class Auction {
  constructor(ilk, smartContractService) {
    switch (ilk) {
      case MDAI.symbol:
        this.contract = smartContractService.getContract('MCD_FLAP');
        break;
      case 'MKR':
        this.contract = smartContractService.getContract('MCD_FLOP');
        break;
      default:
        this.contract = smartContractService.getContract(
          'MCD_FLIP_' + ilk.replace(/-/g, '_')
        );
    }
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
      .div(WAD)
      .minus(1)
      .toNumber();
  }
}
