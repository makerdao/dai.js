import { castAsCurrency, stringToBytes } from './utils';
import { tracksTransactionsWithOptions } from './utils/tracksTransactions';
import { ServiceRoles } from './constants';
import ethAbi from 'web3-eth-abi';
import assert from 'assert';
import { MDAI } from './index';
import {
  collateralAmount,
  collateralValue,
  collateralizationRatio,
  daiAvailable,
  debtValue,
  liquidationPrice,
  minSafeCollateralAmount
} from './math';

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
    if (options.prefetch) {
      this._getUrnInfo();
    }
  }

  async getCollateralAmount() {
    await this._getUrnInfo();
    return this.getCollateralAmountSync();
  }

  getCollateralAmountSync() {
    return collateralAmount(this.currency, this._getCached('urnInfo').ink);
  }

  async getCollateralValue() {
    await Promise.all([this._getUrnInfo(), this.type.getPrice()]);
    return this.getCollateralValueSync();
  }

  getCollateralValueSync() {
    return collateralValue(
      this.getCollateralAmountSync(),
      this.type.getPriceSync()
    );
  }

  async getDebtValue() {
    await Promise.all([this.type.ilkInfo(), this._getUrnInfo()]);
    return this.getDebtValueSync();
  }

  getDebtValueSync() {
    return debtValue(
      this._getCached('urnInfo').art,
      this.type._getCached('vatInfo').rate
    );
  }

  async getCollateralizationRatio() {
    await Promise.all([this.getCollateralValue(), this.getDebtValue()]);
    return this.getCollateralizationRatioSync();
  }

  getCollateralizationRatioSync() {
    return collateralizationRatio(
      this.getCollateralValueSync(),
      this.getDebtValueSync()
    );
  }

  async getLiquidationPrice() {
    await Promise.all([
      this.type.getLiquidationRatio(),
      this.getDebtValue(),
      this.getCollateralAmount()
    ]);
    return this.getLiquidationPriceSync();
  }

  getLiquidationPriceSync() {
    return liquidationPrice(
      this.getCollateralAmountSync(),
      this.getDebtValueSync(),
      this.type.getLiquidationRatioSync()
    );
  }

  async isSafe() {
    await Promise.all([this.getLiquidationPrice(), this.type.getPrice()]);
    return this.isSafeSync();
  }

  isSafeSync() {
    return this.type.getPriceSync().gte(this.getLiquidationPriceSync());
  }

  async getMinSafeCollateralAmount() {
    await Promise.all([
      this.getDebtValue(),
      this.type.getLiquidationRatio(),
      this.type.getPrice()
    ]);
    return this.getMinSafeCollateralAmountSync();
  }

  getMinSafeCollateralAmountSync() {
    return minSafeCollateralAmount(
      this.getDebtValueSync(),
      this.type.getLiquidationRatioSync(),
      this.type.getPriceSync()
    );
  }

  async getCollateralAvailable() {
    await Promise.all([
      this.getCollateralAmount(),
      this.getMinSafeCollateralAmount()
    ]);
    return this.getCollateralAvailableSync();
  }

  getCollateralAvailableSync() {
    return this.getCollateralAmountSync().minus(
      this.getMinSafeCollateralAmountSync()
    );
  }

  async getDaiAvailable() {
    await Promise.all([
      this.getCollateralValue(),
      this.type.getLiquidationRatio(),
      this.getDebtValue()
    ]);
    return this.getDaiAvailableSync();
  }

  getDaiAvailableSync() {
    return daiAvailable(
      this.getCollateralValueSync(),
      this.getDebtValueSync(),
      this.type.getLiquidationRatioSync()
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
    return this.lock(this.id, this.ilk, amount, { promise });
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
    return this.wipe(this.id, amount, { promise });
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
