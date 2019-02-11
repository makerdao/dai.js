import { RAY } from '@makerdao/dai/utils/constants';
import BigNumber from 'bignumber.js';
import {
  getIlkForCurrency,
  getSpotContractNameForCurrency,
  getPipContractNameForCurrency
} from './utils';
import { createCurrencyRatio, USD } from '@makerdao/dai';
import { MDAI } from './index';

export default class CdpType {
  constructor(systemData, currency) {
    this._systemData = systemData;
    this.currency = currency;

    // for now the ilkId is just the currency symbol, but this wont't necessarily
    // always be the case
    this.ilkId = currency.symbol;
    this._ilkBytes = getIlkForCurrency(currency);
  }

  async getTotalCollateral(unit = this.currency) {
    const { Ink } = await this.ilkInfo();
    const value = this.currency.wei(Ink);
    if (unit === this.currency) return value;
    if (unit === USD) return value.times(await this.getPrice());

    throw new Error(
      `Don't know how to get total collateral in ${
        unit.symbol ? unit.symbol : unit
      }`
    );
  }

  async getTotalDebt() {
    const { Art, rate } = await this.ilkInfo();
    return MDAI.wei(Art).times(rate).shiftedBy(-27);
  }

  async getDebtCeiling() {
    const { line } = await this.ilkInfo('pit');
    return MDAI.wei(line);
  }

  async getLiquidationRatio() {
    const mat = await this.spot.mat();
    return new BigNumber(mat.toString()).dividedBy(RAY).toNumber();
  }

  async getPrice() {
    const val = (await this.pip.peek())[0];
    // TODO should the dividedBy arg here depend on the token's decimals value?
    const ratio = createCurrencyRatio(USD, this.currency);
    return ratio.wei(val);
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
    return this._systemData[contract].ilks(this._ilkBytes);
  }

  get pip() {
    return this._systemData
      .get('smartContract')
      .getContract(getPipContractNameForCurrency(this.currency));
  }

  get spot() {
    return this._systemData
      .get('smartContract')
      .getContract(getSpotContractNameForCurrency(this.currency));
  }
}
