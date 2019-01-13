import Maker from '@makerdao/dai';
import { numberToBytes32 } from '@makerdao/dai/utils/conversion';
import { WAD, RAY } from '@makerdao/dai/utils/constants';
import BigNumber from 'bignumber.js';
import { getIlkForCurrency, getSpotContractNameForCurrency, getPipContractNameForCurrency } from './utils';

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

  async getPrice(currency) {
    const pipContract = this._pipContract(currency);
    const val = (await pipContract.peek())[0];
    return new BigNumber(val.toString()).dividedBy(RAY).toNumber();
  }

  async getLiquidationPenalty(currency) {
    const ilkBytes = getIlkForCurrency(currency);
    const ilkInfo = await this._catContract().ilks(numberToBytes32(ilkBytes));
    const chop = ilkInfo.chop;
    return new BigNumber(chop.toString()).dividedBy(RAY).minus(1).toNumber();
  }

  async getAnnualStabilityFee(currency) {
    const ilkBytes = getIlkForCurrency(currency);
    const ilkInfo = await this._dripContract().ilks(numberToBytes32(ilkBytes));
    const tax = ilkInfo.tax;
    const taxBigNumber = new BigNumber(tax.toString()).dividedBy(RAY);
    const secondsPerYear = 60 * 60 * 24 * 365;
    BigNumber.config({ POW_PRECISION: 100 });
    return taxBigNumber
      .pow(secondsPerYear)
      .minus(1)
      .toNumber();
  }

  _dripContract(currency) {
    return this.get('smartContract').getContractByName('MCD_DRIP');
  }

  _pipContract(currency) {
    return this.get('smartContract').getContractByName(getPipContractNameForCurrency(currency));
  }

  _spotContract(currency) {
    return this.get('smartContract').getContractByName(getSpotContractNameForCurrency(currency));
  }

  _catContract() {
    return this.get('smartContract').getContractByName('MCD_CAT');
  }

  _pitContract() {
    return this.get('smartContract').getContractByName('MCD_PIT');
  }

  _vatContract() {
    return this.get('smartContract').getContractByName('MCD_VAT');
  }

}