import { WAD, RAY } from '@makerdao/dai/utils/constants';
import BigNumber from 'bignumber.js';
import {
  getIlkForCurrency,
  getSpotContractNameForCurrency,
  getPipContractNameForCurrency
} from './utils';
import { USD } from '@makerdao/dai';

export default class CdpType {
  constructor(smartContractService, currency) {
    this._smartContract = smartContractService;
    this.currency = currency;

    // for now the ilkId is just the currency symbol, but this wont't necessarily
    // always be the case
    this.ilkId = currency.symbol;
    this._ilkBytes = getIlkForCurrency(currency);
  }

  async getTotalCollateral(unit = this.currency) {
    const { Ink } = await this.ilkInfo();
    const collateralValue = new BigNumber(Ink.toString())
      .dividedBy(WAD)
      .toNumber();
    if (unit === this.currency) return collateralValue;

    if (unit === USD) {
      const collateralPrice = await this.getPrice();
      return collateralValue * collateralPrice;
    }

    throw new Error(
      `Don't know how to get total collateral in ${
        unit.symbol ? unit.symbol : unit
      }`
    );
  }

  async getTotalDebt() {
    const { Art } = await this.ilkInfo();
    return new BigNumber(Art.toString()).dividedBy(WAD).toNumber();
  }

  async getDebtCeiling() {
    const { line } = await this.ilkInfo('pit');
    return new BigNumber(line.toString()).dividedBy(WAD).toNumber();
  }

  async getLiquidationRatio() {
    const mat = await this.spot.mat();
    return new BigNumber(mat.toString()).dividedBy(RAY).toNumber();
  }

  async getPrice() {
    const val = (await this.pip.peek())[0];
    return new BigNumber(val.toString()).dividedBy(RAY).toNumber();
  }

  async getLiquidationPenalty() {
    const { chop } = await this.ilkInfo('cat');
    return new BigNumber(chop.toString())
      .dividedBy(RAY)
      .minus(1)
      .toNumber();
  }

  async getAnnualStabilityFee() {
    const { tax } = await this.ilkInfo('drip');
    const taxBigNumber = new BigNumber(tax.toString()).dividedBy(RAY);
    const secondsPerYear = 60 * 60 * 24 * 365;
    BigNumber.config({ POW_PRECISION: 100 });
    return taxBigNumber
      .pow(secondsPerYear)
      .minus(1)
      .toNumber();
  }

  // Helpers ----------------------------------------------

  async ilkInfo(contract = 'vat') {
    return this[contract].ilks(this._ilkBytes);
  }

  get drip() {
    return this._smartContract.getContract('MCD_DRIP');
  }

  get pip() {
    return this._smartContract.getContract(
      getPipContractNameForCurrency(this.currency)
    );
  }

  get spot() {
    return this._smartContract.getContract(
      getSpotContractNameForCurrency(this.currency)
    );
  }

  get cat() {
    return this._smartContract.getContract('MCD_CAT');
  }

  get pit() {
    return this._smartContract.getContract('MCD_PIT');
  }

  get vat() {
    return this._smartContract.getContract('MCD_VAT');
  }
}
