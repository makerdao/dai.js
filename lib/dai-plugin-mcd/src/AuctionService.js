import { PublicService } from '@makerdao/services-core';
import Auction from './Auction';
import { ServiceRoles } from './constants';

export default class AuctionService extends PublicService {
  constructor(name = ServiceRoles.AUCTION) {
    super(name, ['smartContract']);
  }

  getAuction(currency) {
    return new Auction(this.get('smartContract'), currency);
  }
}
