import assert from 'assert';
import { stringToBytes } from './utils';
import tracksTransactions from './utils/tracksTransactions';

export default class PsmType {
  constructor(
    psmTypeService,
    { currency, ilk, decimals },
    options = { prefect: true }
  ) {
    assert(currency && ilk, 'currency and ilk are required');

    this._psmTypeService = psmTypeService;
    this.currency = currency;
    this.decimals = decimals;
    this.ilk = ilk;
    this._ilkBytes = stringToBytes(this.ilk);
    this.cache = {};
    if (options.prefetch) this.prefetch();
  }

  get feeIn() {}

  get feeOut() {}

  prefetch() {}

  async reset() {
    this._prefetchPromise = null;
    this.cache = {};
  }

  _getCached(name) {
    assert(this.cache[name], `${name} is not cached`);
    return this.cache[name];
  }
}
