import Maker from '@makerdao/dai';
import { numberToBytes32 } from '@makerdao/dai/utils/conversion';
import { WAD, RAY } from '@makerdao/dai/utils/constants';
import BigNumber from 'bignumber.js';
import { getIlkForCurrency } from './utils';

export default class CollateralService extends Maker.PublicService {

  constructor(name = 'collateral') {
    super(name, ['smartContract']);
  }

  //todo: allow specifying unit for return value (requires a price service that gives price given an ilkBytes)
  async getTotalCollateral(currency) {
    const ilkBytes = getIlkForCurrency(currency);
    const ilkInfo = await this._vatContract().ilks(numberToBytes32(ilkBytes));
    const Art = ilkInfo.Art;
    return new BigNumber(Art.toString()).dividedBy(RAY).toNumber();
  }

  _vatContract() {
    return this.get('smartContract').getContractByName('MCD_VAT');
  }

}