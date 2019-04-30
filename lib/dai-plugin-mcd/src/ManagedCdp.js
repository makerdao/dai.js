import { castAsCurrency, stringToBytes } from './utils';
import { tracksTransactionsWithOptions } from './utils/tracksTransactions';
import { ServiceRoles } from './constants';
import ethAbi from 'web3-eth-abi';
import assert from 'assert';
import { MDAI } from './index';

export default class ManagedCdp {
  constructor(id, ilk, cdpManager) {
    assert(typeof id === 'number', 'ID must be a number');
    this.id = id;

    assert(ilk && typeof ilk === 'string', 'Must specify ilk');
    this.ilk = ilk;
    this._cdpManager = cdpManager;
    this.type = cdpManager.get(ServiceRoles.CDP_TYPE).getCdpType(null, ilk);
    this.currency = this.type.currency;
    this._getUrnInfo();
    this._getIlkInfo();
  }

  async getCollateralAmount() {
    return this.currency.wei((await this._getUrnInfo()).ink);
  }

  async getCollateralValue() {
    const [collateral, price] = await Promise.all([
      this.getCollateralAmount(),
      this.type.getPrice()
    ]);
    return collateral.times(price);
  }

  async getDebtValue() {
    const [ilkInfo, urnInfo] = await Promise.all([
      this._getIlkInfo(),
      this._getUrnInfo()
    ]);
    const art = MDAI.wei(urnInfo.art);
    return art.times(ilkInfo.rate).shiftedBy(-27);
  }

  async getCollateralizationRatio() {
    const [collateral, debt] = await Promise.all([
      this.getCollateralValue(),
      this.getDebtValue()
    ]);
    assert(debt.gt(0), 'Debt cannot be zero');
    return collateral.div(debt);
  }

  async getLiquidationPrice() {
    const [liquidationRatio, debt, collateral] = await Promise.all([
      this.type.getLiquidationRatio(),
      this.getDebtValue(),
      this.getCollateralAmount()
    ]);
    assert(collateral.gt(0), 'Collateral cannot be zero');
    return debt.times(liquidationRatio).div(collateral);
  }

  async isSafe() {
    const [liqPrice, collPrice] = await Promise.all([
      this.getLiquidationPrice(),
      this.type.getPrice()
    ]);
    return collPrice.gte(liqPrice);
  }

  async minCollateral() {
    const [debt, liquidationRatio, price, collateral] = await Promise.all([
      this.getDebtValue(),
      this.type.getLiquidationRatio(),
      this.type.getPrice(),
      this.getCollateralAmount()
    ]);
    const minSafe = debt.times(liquidationRatio).div(price);
    return minSafe.gt(collateral) ? collateral : minSafe;
  }

  async getCollateralAvailable() {
    const [collateral, lockedCollateral] = await Promise.all([
      this.getCollateralAmount(),
      this.minCollateral()
    ]);
    return collateral.minus(lockedCollateral);
  }

  async getDaiAvailable() {
    const [collateral, liquidationRatio, debt] = await Promise.all([
      this.getCollateralValue(),
      this.type.getLiquidationRatio(),
      this.getDebtValue()
    ]);
    const dai = collateral.div(liquidationRatio).minus(debt);
    return dai.gte(0) ? dai : MDAI(0);
  }

  lockCollateral(amount, { promise } = {}) {
    return this.lockAndDraw(amount, undefined, { promise });
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
    return this.wipeAndFree(amount, undefined, { promise });
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
    return this._urnInfoPromise;
  }

  async _getIlkInfo() {
    if (!this._ilkInfoPromise) {
      let _cdpType = this._cdpManager
        .get(ServiceRoles.CDP_TYPE)
        .getCdpType(this.currency, this.ilk);
      this._ilkInfoPromise = _cdpType.ilkInfo();
    }
    return this._ilkInfoPromise;
  }

  async reset() {
    this._urnInfoPromise = null;
    this._ilkInfoPromise = null;
  }
}

ManagedCdp.create = function(createTxo, ilk, cdpManager) {
  const sig = ethAbi.encodeEventSignature('NewCdp(address,address,uint256)');
  const log = createTxo.receipt.logs.find(l => l.topics[0] === sig);
  assert(log, 'could not find log for NewCdp event');
  const id = parseInt(log.data, 16);
  return new ManagedCdp(id, ilk, cdpManager);
};
