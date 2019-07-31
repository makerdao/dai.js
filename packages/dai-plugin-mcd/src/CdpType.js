import assert from 'assert';
import { ServiceRoles } from './constants';
import { stringToBytes } from './utils';
import { MDAI, USD, ETH, MWETH } from './index';
import * as math from './math';

export default class CdpType {
  constructor(
    cdpTypeService,
    { currency, ilk, decimals },
    options = { prefetch: true }
  ) {
    assert(currency && ilk, 'currency and ilk are required');
    this._cdpTypeService = cdpTypeService;
    this._systemData = cdpTypeService.get(ServiceRoles.SYSTEM_DATA);
    this._web3Service = this._systemData.get('smartContract').get('web3');
    this.currency = currency;
    this.decimals = decimals || 18;
    this.ilk = ilk;
    this._ilkBytes = stringToBytes(this.ilk);
    this.cache = {};
    if (options.prefetch) this.prefetch();
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
    await this._getVatInfo();
    return this.totalDebt;
  }

  get totalDebt() {
    const { Art, rate } = this._getCached('vatInfo');
    return MDAI.wei(Art)
      .times(rate)
      .shiftedBy(-27);
  }

  async getDebtCeiling() {
    await this._getVatInfo();
    return this.debtCeiling;
  }

  get debtCeiling() {
    return math.debtCeiling(this._getCached('vatInfo').line);
  }

  async getLiquidationRatio() {
    await this._getSpotInfo();
    return this.liquidationRatio;
  }

  get liquidationRatio() {
    return math.liquidationRatio(this._getCached('spotInfo').mat);
  }

  async getPrice() {
    await Promise.all([
      this._getVatInfo(),
      this._getSpotInfo(),
      this._getPar()
    ]);
    return this.price;
  }

  get price() {
    return math.price(
      this.currency,
      this._getCached('par'),
      this._getCached('vatInfo').spot,
      this.liquidationRatio
    );
  }

  async getLiquidationPenalty() {
    await this._getCatInfo();
    return this.liquidationPenalty;
  }

  get liquidationPenalty() {
    return math.liquidationPenalty(this._getCached('catInfo').chop);
  }

  async getAnnualStabilityFee() {
    await this._getJugInfo();
    return this.annualStabilityFee;
  }

  get annualStabilityFee() {
    return math.annualStabilityFee(this._getCached('jugInfo').duty);
  }

  async getPriceHistory(num = 100) {
    const prices = await this._cdpTypeService
      .get(ServiceRoles.QUERY_API)
      .getPriceHistoryForPip(this._pipAddress, num);
    return Promise.all(
      prices.map(async e => {
        const price = this.currency.wei(e.val);
        //todo: update this query to read the datetime directly from vdb once vdb is updated with that functionality
        const timestamp = (await this._web3Service.getBlock(e.blockNumber))
          .timestamp;
        const time = new Date(1000 * timestamp);
        return { price, time };
      })
    );
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
    return this._parPromise.then(value => {
      this.cache.par = value;
      return value;
    });
  }

  async _getVatInfo() {
    if (!this._vatInfoPromise) this._vatInfoPromise = this.ilkInfo();
    return this._vatInfoPromise.then(value => {
      this.cache.vatInfo = value;
      return value;
    });
  }

  async _getCatInfo() {
    if (!this._catInfoPromise) this._catInfoPromise = this.ilkInfo('cat');
    return this._catInfoPromise.then(value => {
      this.cache.catInfo = value;
      return value;
    });
  }

  async _getSpotInfo() {
    if (!this._spotInfoPromise) this._spotInfoPromise = this.ilkInfo('spot');
    return this._spotInfoPromise.then(value => {
      this.cache.spotInfo = value;
      return value;
    });
  }

  async _getJugInfo() {
    if (!this._jugInfoPromise) this._jugInfoPromise = this.ilkInfo('jug');
    return this._jugInfoPromise.then(value => {
      this.cache.jugInfo = value;
      return value;
    });
  }

  async prefetch() {
    // TODO allow passing in a multicall instance to use that instead of making
    // separate calls
    return Promise.all([
      this._getPar(),
      this._getVatInfo(),
      this._getCatInfo(),
      this._getSpotInfo(),
      this._getJugInfo()
    ]);
  }

  async reset() {
    this._parPromise = null;
    this._vatInfoPromise = null;
    this._catInfoPromise = null;
    this._spotInfoPromise = null;
    this._jugInfoPromise = null;
    this.cache = {};
  }

  _getCached(name) {
    assert(this.cache[name], `${name} is not cached`);
    return this.cache[name];
  }
}
