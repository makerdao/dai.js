import assert from 'assert';
import CdpType from './CdpType';
import { ServiceRoles } from './constants';
import tracksTransactions from './utils/tracksTransactions';
import { DAI } from './index';
import { castAsCurrency } from './utils';

export default class PsmType {
  constructor(
    psmTypeService,
    { currency, ilk, decimals, pair },
    options = { prefetch: true }
  ) {
    assert(currency && ilk, 'currency and ilk are required');

    this._psmTypeService = psmTypeService;
    this._smartContractService = this._psmTypeService
      .get(ServiceRoles.SYSTEM_DATA)
      .get('smartContract');
    this._cdpType = new CdpType(
      this._psmTypeService,
      { currency, ilk, decimals },
      options
    );
    this.currency = currency;
    this.decimals = decimals;
    this.ilk = ilk;
    this.pair = pair;
    this._cache = {};
    if (options.prefetch) this.prefetch();
  }

  get feeIn() {
    return this._getCached('psmInfo').feeIn;
  }

  get feeOut() {
    return this._getCached('psmInfo').feeOut;
  }

  get debtCeiling() {
    return this._cdpType.debtCeiling;
  }

  get totalCollateral() {
    return this._cdpType.totalCollateral;
  }

  get totalDebt() {
    return this._cdpType.totalDebt;
  }

  @tracksTransactions
  join(amount = this.currency(0), { promise }) {
    amount = castAsCurrency(amount, this.currency);
    return this.psm.join(amount.toFixed(this.decimals), {
      promise,
      metadata: { from: this.currency.symbol, to: this.pair.symbol }
    });
  }

  @tracksTransactions
  exit(amount = this.pair(0), { promise }) {
    amount = castAsCurrency(amount, this.pair);
    return this.psm.exit(amount.toFixed(this.decimals), {
      promise,
      metadata: { from: this.pair.symbol, to: this.currency.symbol }
    });
  }

  async prefetch() {
    if (!this._prefetchPromise) {
      this._prefetchPromise = Promise.all([
        this._cdpType.prefetch(),
        Promise.all([
          this.psm.feeIn().then(x => (this._cache.feeIn = x)),
          this.psm.feeOut().then(x => (this._cache.feeOut = x))
        ])
      ]);
    }
    return this._prefetchPromise;
  }

  reset() {
    this._cdpType.reset();
    this._cache = {};
  }

  cache() {
    return {
      psmInfo: this._cache,
      ...this._cdpType.cache
    };
  }

  _getCached(name) {
    assert(this.cache()[name], `${name} is not cached`);
    return this.cache()[name];
  }

  get psm() {
    return this._smartContractService.getContract(this.ilk.replace(/-/g, '_'));
  }

  get address() {
    return this.psm.address;
  }
}
