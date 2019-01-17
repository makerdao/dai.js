import Maker from '@makerdao/dai';
import { WAD, RAY } from '@makerdao/dai/utils/constants';
import BigNumber from 'bignumber.js';
import { getIlkForCurrency, getSpotContractNameForCurrency, getPipContractNameForCurrency, getFlipContractNameForCurrency } from './utils';
import Auction from './Auction';

export default class AuctionService extends Maker.PublicService {

  constructor(name = 'auction') {
    super(name, ['smartContract']);
  }

  getAuction(currency){
    return new Auction(this.get('smartContract'), currency);
  }

}
