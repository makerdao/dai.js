import Maker from '@makerdao/dai';
import Auction from './Auction';
import { ServiceRoles } from './constants';

export default class AuctionService extends Maker.PublicService {
  constructor(name = ServiceRoles.AUCTION) {
    super(name, ['smartContract']);
  }

  getAuction(currency) {
    return new Auction(this.get('smartContract'), currency);
  }
}
