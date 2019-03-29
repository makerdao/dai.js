import assert from 'assert';
import { createCurrencyRatio } from '@makerdao/currency';
import BigNumber from 'bignumber.js';
import { RAY } from './constants';
import { stringToBytes } from './utils';
import { MDAI, USD, ETH, MWETH } from './index';

export default class CdpType {
  constructor(systemData, { currency, ilk }) {
    assert(currency && ilk, 'currency and ilk are required');
    this._systemData = systemData;
    this.currency = currency;
    this.ilk = ilk;
    this._ilkBytes = stringToBytes(this.ilk);
  }

  async getTotalCollateral(unit = this.currency) {
    let { symbol } = this.currency;

    // we handle ETH ilks differently because their adapters are GemJoins which
    // convert the ETH to WETH, so we need to check the WETH balance
    if (this.currency === ETH) symbol = MWETH.symbol;

    const token = this._systemData.get('token').getToken(symbol);
    const adapterAddress = this._systemData.adapterAddress(this.ilk);
    let value = await token.balanceOf(adapterAddress);

    if (this.currency === ETH) value = ETH(value);
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
    const val = await this._web3().eth.getStorageAt(this._pipAddress(), 2);
    // const { spot } = await this.ilkInfo();
    // TODO should the dividedBy arg here depend on the token's decimals value?
    const ratio = createCurrencyRatio(USD, this.currency);
    //TODO: verify correct number of deciamls for val
    return ratio.wei(new BigNumber(val.toString()));
  }

  async getLiquidationPenalty() {
    const { chop } = await this.ilkInfo('cat');
    return new BigNumber(chop.toString())
      .dividedBy(RAY)
      .minus(1)
      .toNumber();
  }

  async getAnnualStabilityFee() {
    const { duty } = await this.ilkInfo('jug');
    const dutyBigNumber = new BigNumber(duty.toString()).dividedBy(RAY);
    const secondsPerYear = 60 * 60 * 24 * 365;
    BigNumber.config({ POW_PRECISION: 100 });
    return dutyBigNumber
      .pow(secondsPerYear)
      .minus(1)
      .toNumber();
  }

  async ilkInfo(contract = 'vat') {
    return this._systemData[contract].ilks(this._ilkBytes);
  }

  _pipAddress() {
    const contract = 'PIP_' + this.currency.symbol;
    return this._systemData.get('smartContract').getContractAddress(contract);
  }

  _web3() {
    return this._systemData.get('smartContract').get('web3')._web3;
  }
}
