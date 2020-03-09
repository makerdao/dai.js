import assert from 'assert';
import { ServiceRoles } from './constants';
import { stringToBytes } from './utils';
import { MDAI, ETH, MWETH } from './index';
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

  get totalCollateral() {
    return this.currency(this._getCached('adapterBalance'));
  }

  get totalDebt() {
    const { Art, rate } = this._getCached('vatInfo');
    return MDAI.wei(Art)
      .times(rate)
      .shiftedBy(-27);
  }

  get debtCeiling() {
    return math.debtCeiling(this._getCached('vatInfo').line);
  }

  get liquidationRatio() {
    return math.liquidationRatio(this._getCached('spotInfo').mat);
  }

  get price() {
    return math.price(
      this.currency,
      this._getCached('par'),
      this._getCached('vatInfo').spot,
      this.liquidationRatio
    );
  }

  get liquidationPenalty() {
    return math.liquidationPenalty(this._getCached('catInfo').chop);
  }

  get annualStabilityFee() {
    return math.annualStabilityFee(this._getCached('jugInfo').duty);
  }

  async ilkInfo(contract = 'vat') {
    return this._systemData[contract].ilks(this._ilkBytes);
  }

  get _pipAddress() {
    const contract = 'PIP_' + this.currency.symbol;
    return this._systemData.get('smartContract').getContractAddress(contract);
  }

  async prefetch() {
    // TODO allow passing in a multicall instance to use that instead of making
    // separate calls
    if (!this._prefetchPromise) {
      const adapterAddress = this._systemData.adapterAddress(this.ilk);
      const { symbol } = this.currency === ETH ? MWETH : this.currency;

      this._prefetchPromise = Promise.all([
        this._systemData
          .get('token')
          .getToken(symbol)
          .balanceOf(adapterAddress)
          .then(x => (this.cache.adapterBalance = x)),
        this.ilkInfo().then(x => (this.cache.vatInfo = x)),
        this.ilkInfo('cat').then(x => (this.cache.catInfo = x)),
        this.ilkInfo('jug').then(x => (this.cache.jugInfo = x)),
        this.ilkInfo('spot').then(x => (this.cache.spotInfo = x)),
        this._systemData.spot.par().then(x => (this.cache.par = x))
      ]);
    }
    return this._prefetchPromise;
  }

  async reset() {
    this._prefetchPromise = null;
    this.cache = {};
  }

  _getCached(name) {
    assert(this.cache[name], `${name} is not cached`);
    return this.cache[name];
  }
}
