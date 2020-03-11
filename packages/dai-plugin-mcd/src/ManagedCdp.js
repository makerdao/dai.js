import { castAsCurrency, stringToBytes } from './utils';
import tracksTransactions, {
  tracksTransactionsWithOptions
} from './utils/tracksTransactions';
import { ServiceRoles } from './constants';
import assert from 'assert';
import { MDAI } from './index';
import * as math from './math';

export default class ManagedCdp {
  constructor(id, ilk, cdpManager, options = { prefetch: true }) {
    assert(typeof id === 'number', 'ID must be a number');
    this.id = id;

    assert(ilk && typeof ilk === 'string', 'Must specify ilk');
    this.ilk = ilk;
    this._cdpManager = cdpManager;
    this.type = cdpManager.get(ServiceRoles.CDP_TYPE).getCdpType(null, ilk);
    this.currency = this.type.currency;
    this.cache = {};
    if (options.prefetch) this.prefetch();
  }

  get collateralAmount() {
    return math.collateralAmount(this.currency, this._getCached('urnInfo').ink);
  }

  get collateralValue() {
    return math.collateralValue(this.collateralAmount, this.type.price);
  }

  get debtValue() {
    return math.debtValue(
      this._getCached('urnInfo').art,
      this.type._getCached('vatInfo').rate
    );
  }

  get collateralizationRatio() {
    return math.collateralizationRatio(this.collateralValue, this.debtValue);
  }

  get liquidationPrice() {
    return math.liquidationPrice(
      this.collateralAmount,
      this.debtValue,
      this.type.liquidationRatio
    );
  }

  get isSafe() {
    return this.type.price.gte(this.liquidationPrice);
  }

  get minSafeCollateralAmount() {
    return math.minSafeCollateralAmount(
      this.debtValue,
      this.type.liquidationRatio,
      this.type.price
    );
  }

  get collateralAvailable() {
    return this.collateralAmount.minus(this.minSafeCollateralAmount);
  }

  get daiAvailable() {
    return math.daiAvailable(
      this.collateralValue,
      this.debtValue,
      this.type.liquidationRatio
    );
  }

  getOwner() {
    return this._cdpManager.getOwner(this.id);
  }

  getUrn() {
    return this._cdpManager.getUrn(this.id);
  }

  // TODO: after these operations complete, update the cache. once that's done,
  // update ManagedCdp.spec to use expectValues instead of
  // expectValuesAfterReset in more places
  lockCollateral(amount) {
    amount = castAsCurrency(amount, this.currency);
    return this._cdpManager.lock(this.id, this.ilk, amount, null);
  }

  @tracksTransactions
  drawDai(amount, { promise }) {
    return this._cdpManager.draw(this.id, this.ilk, amount, { promise });
  }

  @tracksTransactionsWithOptions({ numArguments: 3 })
  lockAndDraw(
    lockAmount = this.currency(0),
    drawAmount = MDAI(0),
    { promise }
  ) {
    assert(lockAmount && drawAmount, 'amounts must be defined');
    lockAmount = castAsCurrency(lockAmount, this.currency);
    drawAmount = castAsCurrency(drawAmount, MDAI);
    return this._cdpManager.lockAndDraw(
      this.id,
      this.ilk,
      lockAmount,
      drawAmount,
      { promise }
    );
  }

  wipeDai(amount) {
    amount = castAsCurrency(amount, MDAI);
    return this._cdpManager.wipe(this.id, amount, null);
  }

  unsafeWipe(amount) {
    amount = castAsCurrency(amount, MDAI);
    return this._cdpManager.unsafeWipe(this.id, amount);
  }

  wipeAll() {
    return this._cdpManager.wipeAll(this.id, null);
  }

  unsafeWipeAll() {
    return this._cdpManager.unsafeWipeAll(this.id);
  }

  freeCollateral(amount) {
    return this.wipeAndFree(undefined, amount);
  }

  give(address) {
    return this._cdpManager.give(this.id, address);
  }

  giveToProxy(address) {
    return this._cdpManager.giveToProxy(this.id, address);
  }

  @tracksTransactionsWithOptions({ numArguments: 3 })
  wipeAndFree(
    wipeAmount = MDAI(0),
    freeAmount = this.currency(0),
    { promise }
  ) {
    assert(wipeAmount && freeAmount, 'amounts must be defined');
    wipeAmount = castAsCurrency(wipeAmount, MDAI);
    freeAmount = castAsCurrency(freeAmount, this.currency);
    return this._cdpManager.wipeAndFree(
      this.id,
      this.ilk,
      wipeAmount,
      freeAmount,
      { promise }
    );
  }

  @tracksTransactionsWithOptions({ numArguments: 1 })
  wipeAllAndFree(freeAmount = this.currency(0), { promise }) {
    assert(freeAmount, 'free amount must be defined');
    freeAmount = castAsCurrency(freeAmount, this.currency);
    return this._cdpManager.wipeAllAndFree(this.id, this.ilk, freeAmount, {
      promise
    });
  }

  _getUrnInfo() {
    if (!this._urnInfoPromise) {
      this._urnInfoPromise = this._cdpManager
        .getUrn(this.id)
        .then(urn => this._cdpManager.vat.urns(stringToBytes(this.ilk), urn));
    }
    return this._urnInfoPromise.then(value => {
      this.cache.urnInfo = value;
      return value;
    });
  }

  _getCached(name) {
    assert(this.cache[name], `${name} is not cached`);
    return this.cache[name];
  }

  prefetch() {
    // TODO allow passing in a multicall instance to use that instead of making
    // separate calls
    return Promise.all([this._getUrnInfo(), this.type.prefetch()]);
  }

  reset() {
    this._urnInfoPromise = null;
    this.cache = {};
    this.type.reset();
  }
}

ManagedCdp.create = async function(createTxo, ilk, cdpManager) {
  const id = cdpManager.getNewCdpId(createTxo);
  const cdp = new ManagedCdp(id, ilk, cdpManager);
  await cdp.prefetch();
  return cdp;
};
