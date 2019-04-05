import { createCurrencyRatio } from '@makerdao/currency';
import { castAsCurrency, stringToBytes } from './utils';
import { tracksTransactionsWithOptions } from './utils/tracksTransactions';
import { ServiceRoles } from './constants';
import ethAbi from 'web3-eth-abi';
import assert from 'assert';
import { MDAI, USD } from './index';

export default class ManagedCdp {
  constructor(id, ilk, cdpManager) {
    assert(typeof id === 'number', 'ID must be a number');
    this.id = id;

    assert(ilk && typeof ilk === 'string', 'Must specify ilk');
    this.ilk = ilk;
    this._cdpManager = cdpManager;
    this._cdpType = cdpManager.get(ServiceRoles.CDP_TYPE).getCdpType(null, ilk);
    this.currency = this._cdpType.currency;
  }

  async getCollateralAmount() {
    return this.currency.wei((await this._urnInfo()).ink);
  }

  async getCollateralValue() {
    const [collateral, price] = await Promise.all([
      this.getCollateralAmount(),
      this._cdpType.getPrice()
    ]);
    return collateral.times(price);
  }

  async getDebtValue() {
    const cdpType = this._cdpManager
      .get(ServiceRoles.CDP_TYPE)
      .getCdpType(this.currency, this.ilk);
    const { rate } = await cdpType.ilkInfo();
    const art = MDAI.wei((await this._urnInfo()).art);
    return art.times(rate).shiftedBy(-27);
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
      this._cdpType.getLiquidationRatio(),
      this.getDebtValue(),
      this.getCollateralAmount()
    ]);
    assert(collateral.gt(0), 'Collateral cannot be zero');
    const ratio = createCurrencyRatio(USD, this._cdpType.currency);
    return ratio(
      debt
        .times(liquidationRatio)
        .div(collateral)
        .toNumber()
    );
  }

  async isSafe() {
    const [liqPrice, collPrice] = await Promise.all([
      this.getLiquidationPrice(),
      this._cdpType.getPrice()
    ]);
    return collPrice.gte(liqPrice);
  }

  async getMinCollateralAmount() {
    const [debt, liquidationRatio, price, collateral] = await Promise.all([
      this.getDebtValue(),
      this._cdpType.getLiquidationRatio(),
      this._cdpType.getPrice(),
      this.getCollateralAmount()
    ]);
    const lockedCollateral = this._cdpType.currency(
      debt.times(liquidationRatio).div(price.toNumber())
    );
    return lockedCollateral.toNumber() > collateral.toNumber()
      ? collateral
      : lockedCollateral;
  }

  async getCollateralAvailable() {
    const [collateral, lockedCollateral] = await Promise.all([
      this.getCollateralAmount(),
      this.getMinCollateralAmount()
    ]);
    return collateral.minus(lockedCollateral);
  }

  async daiAvailable() {
    const [collateral, liquidationRatio, debt] = await Promise.all([
      this.getCollateralValue(),
      this._cdpType.getLiquidationRatio(),
      this.getDebtValue()
    ]);
    const dai = collateral.div(liquidationRatio).minus(USD(debt.toNumber()));
    return dai.gte(0) ? dai : 0;
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

  async _urnInfo() {
    return this._cdpManager.vat.urns(
      stringToBytes(this.ilk),
      this._cdpManager.getUrn(this.id)
    );
  }
}

ManagedCdp.create = function(createTxo, ilk, cdpManager) {
  const sig = ethAbi.encodeEventSignature('NewCdp(address,address,uint256)');
  const log = createTxo.receipt.logs.find(l => l.topics[0] === sig);
  assert(log, 'could not find log for NewCdp event');
  const id = parseInt(log.data, 16);
  return new ManagedCdp(id, ilk, cdpManager);
};
