import assert from 'assert';
import CdpType from './CdpType';

export default class PsmType {
  constructor(
    psmTypeService,
    { currency, ilk, decimals },
    options = { prefetch: true }
  ) {
    assert(currency && ilk, 'currency and ilk are required');

    this._psmTypeService = psmTypeService;
    this._cdpType = new CdpType(
      this._psmTypeService,
      { currency, ilk, decimals },
      options
    );
    this.currency = currency;
    this.decimals = decimals;
    this.ilk = ilk;
    this._cache = {};
    if (options.prefetch) this.prefetch();
  }

  get feeIn() {
    return null;
  }

  get feeOut() {
    return null;
  }

  async prefetch() {
    if (!this._prefetchPromise) {
      this._prefetchPromise = Promise.all([this._cdpType.prefetch()]);
    }
    return this._prefetchPromise;
  }

  reset() {
    this._cdpType.reset();
    this._cache = {};
  }

  cache() {
    return {
      ...this._cache,
      ...this._cdpType.cache
    };
  }

  _getCached(name) {
    assert(this.cache()[name], `${name} is not cached`);
    return this.cache()[name];
  }
}
