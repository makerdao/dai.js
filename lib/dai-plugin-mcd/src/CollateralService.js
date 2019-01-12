import Maker from '@makerdao/dai';
import { numberToBytes32 } from '@makerdao/dai/utils/conversion';
import { WAD, RAY } from '@makerdao/dai/utils/constants';
import BigNumber from 'bignumber.js';
import { getIlkForCurrency, getSpotContractNameForCurrency } from './utils';

export default class CollateralService extends Maker.PublicService {

  constructor(name = 'collateral') {
    super(name, ['smartContract']);
  }

  //todo: allow specifying unit for return value (requires a price service that gives price given an ilkBytes)
  async getTotalCollateral(currency) {
    const ilkBytes = getIlkForCurrency(currency);
    const ilkInfo = await this._vatContract().ilks(numberToBytes32(ilkBytes));
    const Ink = ilkInfo.Ink;
    return new BigNumber(Ink.toString()).dividedBy(RAY).toNumber();
  }

  async getTotalDebt(currency) {
    const ilkBytes = getIlkForCurrency(currency);
    const ilkInfo = await this._vatContract().ilks(numberToBytes32(ilkBytes));
    const Art = ilkInfo.Art;
    return new BigNumber(Art.toString()).dividedBy(RAY).toNumber();
  }

  async getDebtCeiling(currency) {
    const ilkBytes = getIlkForCurrency(currency);
    const ilkInfo = await this._pitContract().ilks(numberToBytes32(ilkBytes));
    const line = ilkInfo.line;
    return new BigNumber(line.toString()).dividedBy(RAY).toNumber();
  }

  async getLiquidationRatio(currency) {
    const spotContract = this._spotContract(currency);
    const mat = await spotContract.mat();
    return new BigNumber(mat.toString()).dividedBy(RAY).toNumber();
  }

  _spotContract(currency) {
    return this.get('smartContract').getContractByName(getSpotContractNameForCurrency(currency));
  }

  _pitContract() {
    return this.get('smartContract').getContractByName('MCD_PIT');
  }

  _vatContract() {
    return this.get('smartContract').getContractByName('MCD_VAT');
  }

}