import Maker from '@makerdao/dai';
import Auction from './Auction';

export default class AuctionService extends Maker.PublicService {
  constructor(name = 'auction') {
    super(name, ['smartContract']);
  }

  getAuction(currency) {
    return new Auction(this.get('smartContract'), currency);
  }
}
