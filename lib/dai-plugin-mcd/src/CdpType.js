import assert from 'assert';
import { createCurrencyRatio } from '@makerdao/currency';
import BigNumber from 'bignumber.js';
import { RAY, ServiceRoles } from './constants';
import { stringToBytes } from './utils';
import { MDAI, USD, ETH, MWETH } from './index';

export default class CdpType {
  constructor(cdpTypeService, { currency, ilk }) {
    assert(currency && ilk, 'currency and ilk are required');
    this._cdpTypeService = cdpTypeService;
    this._systemData = cdpTypeService.get(ServiceRoles.SYSTEM_DATA);
    this._web3Service = this._systemData.get('smartContract').get('web3');
    this.currency = currency;
    this.ilk = ilk;
    this._ilkBytes = stringToBytes(this.ilk);
    this._getPar();
    this._getVatInfo();
    this._getCatInfo();
    this._getSpotInfo();
    this._getJugInfo();
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
    const { Art, rate } = await this._getVatInfo();
    return MDAI.wei(Art)
      .times(rate)
      .shiftedBy(-27);
  }

  async getDebtCeiling() {
    const { line } = await this._getVatInfo();
    return MDAI.rad(line);
  }

  async getLiquidationRatio() {
    const { mat } = await this._getSpotInfo();
    const ratio = createCurrencyRatio(USD, MDAI);
    return ratio(new BigNumber(mat.toString()).dividedBy(RAY).toString());
  }

  async getPrice() {
    const [ilkInfo, liqRatio, par] = await Promise.all([
      this._getVatInfo(),
      this.getLiquidationRatio(),
      this._getPar()
    ]);
    const parBN = new BigNumber(par.toString()).dividedBy(RAY);
    const spot = new BigNumber(ilkInfo.spot.toString()).dividedBy(RAY);
    const ratio = createCurrencyRatio(USD, this.currency);
    const price = spot.times(parBN).times(liqRatio.toNumber());
    return ratio(price);
  }

  async getLiquidationPenalty() {
    const { chop } = await this._getCatInfo();
    return new BigNumber(chop.toString())
      .dividedBy(RAY)
      .minus(1)
      .toNumber();
  }

  async getAnnualStabilityFee() {
    const { duty } = await this._getJugInfo();
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

  get _pipAddress() {
    const contract = 'PIP_' + this.currency.symbol;
    return this._systemData.get('smartContract').getContractAddress(contract);
  }

  async _getPar() {
    if (!this._parPromise) this._parPromise = this._systemData.spot.par();
    return this._parPromise;
  }

  async _getVatInfo() {
    if (!this._vatInfoPromise) this._vatInfoPromise = this.ilkInfo();
    return this._vatInfoPromise;
  }

  async _getCatInfo() {
    if (!this._catInfoPromise) this._catInfoPromise = this.ilkInfo('cat');
    return this._catInfoPromise;
  }

  async _getSpotInfo() {
    if (!this._spotInfoPromise) this._spotInfoPromise = this.ilkInfo('spot');
    return this._spotInfoPromise;
  }

  async _getJugInfo() {
    if (!this._jugInfoPromise) this._jugInfoPromise = this.ilkInfo('jug');
    return this._jugInfoPromise;
  }

  async reset() {
    this._par = null;
    this._vat = null;
    this._cat = null;
    this._spot = null;
    this._jug = null;
  }
}
