import { castAsCurrency, stringToBytes } from './utils';
import { tracksTransactionsWithOptions } from './utils/tracksTransactions';
import { ServiceRoles } from './constants';
import ethAbi from 'web3-eth-abi';
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

  async getCollateralAmount() {
    await this._getUrnInfo();
    return this.collateralAmount;
  }

  get collateralAmount() {
    return math.collateralAmount(this.currency, this._getCached('urnInfo').ink);
  }

  async getCollateralValue() {
    await Promise.all([this._getUrnInfo(), this.type.getPrice()]);
    return this.collateralValue;
  }

  get collateralValue() {
    return math.collateralValue(this.collateralAmount, this.type.price);
  }

  async getDebtValue() {
    await Promise.all([this.type.ilkInfo(), this._getUrnInfo()]);
    return this.debtValue;
  }

  get debtValue() {
    return math.debtValue(
      this._getCached('urnInfo').art,
      this.type._getCached('vatInfo').rate
    );
  }

  async getCollateralizationRatio() {
    await Promise.all([this.getCollateralValue(), this.getDebtValue()]);
    return this.collateralizationRatio;
  }

  get collateralizationRatio() {
    return math.collateralizationRatio(this.collateralValue, this.debtValue);
  }

  async getLiquidationPrice() {
    await Promise.all([
      this.type.getLiquidationRatio(),
      this.getDebtValue(),
      this.getCollateralAmount()
    ]);
    return this.liquidationPrice;
  }

  get liquidationPrice() {
    return math.liquidationPrice(
      this.collateralAmount,
      this.debtValue,
      this.type.liquidationRatio
    );
  }

  async getIsSafe() {
    await Promise.all([this.getLiquidationPrice(), this.type.getPrice()]);
    return this.isSafe;
  }

  get isSafe() {
    return this.type.price.gte(this.liquidationPrice);
  }

  async getMinSafeCollateralAmount() {
    await Promise.all([
      this.getDebtValue(),
      this.type.getLiquidationRatio(),
      this.type.getPrice()
    ]);
    return this.minSafeCollateralAmount;
  }

  get minSafeCollateralAmount() {
    return math.minSafeCollateralAmount(
      this.debtValue,
      this.type.liquidationRatio,
      this.type.price
    );
  }

  async getCollateralAvailable() {
    await Promise.all([
      this.getCollateralAmount(),
      this.getMinSafeCollateralAmount()
    ]);
    return this.collateralAvailable;
  }

  get collateralAvailable() {
    return this.collateralAmount.minus(this.minSafeCollateralAmount);
  }

  async getDaiAvailable() {
    await Promise.all([
      this.getCollateralValue(),
      this.type.getLiquidationRatio(),
      this.getDebtValue()
    ]);
    return this.daiAvailable;
  }

  get daiAvailable() {
    return math.daiAvailable(
      this.collateralValue,
      this.debtValue,
      this.type.liquidationRatio
    );
  }

  async getEventHistory() {
    const urn = await this.getUrn();
    const events = await this._cdpManager
      .get(ServiceRoles.QUERY_API)
      .getCdpEventsForIlkAndUrn(stringToBytes(this.ilk), urn);
    return this._cdpManager.parseFrobEvents(
      events,
      this._cdpManager.get(ServiceRoles.CDP_TYPE)
    );
  }

  //todo: add caching?
  async getUrn() {
    return this._cdpManager.getUrn(this.id);
  }

  lockCollateral(amount, { promise } = {}) {
    amount = castAsCurrency(amount, this.currency);
    return this._cdpManager.lock(this.id, this.ilk, amount, { promise });
  }

  drawDai(amount, { promise } = {}) {
    return this.lockAndDraw(undefined, amount, { promise });
  }

  @tracksTransactionsWithOptions({ numArguments: 3 })
  async lockAndDraw(
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

  wipeDai(amount, { promise } = {}) {
    amount = castAsCurrency(amount, MDAI);
    return this._cdpManager.wipe(this.id, amount, { promise });
  }

  freeCollateral(amount, { promise } = {}) {
    return this.wipeAndFree(undefined, amount, { promise });
  }

  @tracksTransactionsWithOptions({ numArguments: 3 })
  async wipeAndFree(
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

  async _getUrnInfo() {
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

  async prefetch() {
    // TODO allow passing in a multicall instance to use that instead of making
    // separate calls
    return Promise.all([
      this._getUrnInfo(),
      this.type.prefetch()
    ]);
  }

  async reset() {
    this._urnInfoPromise = null;
    this.cache = {};
  }
}

ManagedCdp.create = function(createTxo, ilk, cdpManager) {
  const sig = ethAbi.encodeEventSignature('NewCdp(address,address,uint256)');
  const log = createTxo.receipt.logs.find(l => l.topics[0] === sig);
  assert(log, 'could not find log for NewCdp event');
  const id = parseInt(log.data, 16);
  return new ManagedCdp(id, ilk, cdpManager);
};
