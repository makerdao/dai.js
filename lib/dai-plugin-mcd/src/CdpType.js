import { createCurrencyRatio } from '@makerdao/currency';
import BigNumber from 'bignumber.js';
import { RAY } from './constants';
import { stringToBytes } from './utils';
import { MDAI, USD } from './index';

export default class CdpType {
  constructor(systemData, { currency, name }) {
    this._systemData = systemData;
    this.currency = currency;

    this.ilk = name || currency.symbol;
    this._ilkBytes = stringToBytes(this.ilk);
  }

  // FIXME how to get this now that Ilk.Ink was removed from vat?
  async getTotalCollateral(unit = this.currency) {
    throw new Error('getTotalCollateral is broken at the moment');
    // eslint-disable-next-line no-unreachable
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
    return MDAI.wei(Art)
      .times(rate)
      .shiftedBy(-27);
  }

  async getDebtCeiling() {
    const { line } = await this.ilkInfo();
    return MDAI.rad(line);
  }

  async getLiquidationRatio() {
    const { mat } = await this.ilkInfo('spot');
    return new BigNumber(mat.toString()).dividedBy(RAY).toNumber();
  }

  async getPrice() {
    const { spot } = await this.ilkInfo();
    // TODO should the dividedBy arg here depend on the token's decimals value?
    const ratio = createCurrencyRatio(USD, this.currency);
    return ratio.ray(spot);
  }

  async getLiquidationPenalty() {
    const { chop } = await this.ilkInfo('cat');
    return new BigNumber(chop.toString())
      .dividedBy(RAY)
      .minus(1)
      .toNumber();
  }

  async getAnnualStabilityFee() {
    const { tax } = await this.ilkInfo('jug');
    const taxBigNumber = new BigNumber(tax.toString()).dividedBy(RAY);
    const secondsPerYear = 60 * 60 * 24 * 365;
    BigNumber.config({ POW_PRECISION: 100 });
    return taxBigNumber
      .pow(secondsPerYear)
      .minus(1)
      .toNumber();
  }

  async ilkInfo(contract = 'vat') {
    return this._systemData[contract].ilks(this._ilkBytes);
  }
}
