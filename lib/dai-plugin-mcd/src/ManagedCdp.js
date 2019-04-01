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
    this._cdpType = cdpManager.get(ServiceRoles.CDP_TYPE).getCdpType(null, ilk);
    this.currency = this._cdpType.currency;
  }

  async getCollateralValue() {
    return this.currency.wei((await this._urnInfo()).ink);
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
    const [collateral, debt, price] = await Promise.all([
      this.getCollateralValue(),
      this.getDebtValue(),
      this._cdpType.getPrice()
    ]);

    return (
      collateral
        .times(price)
        .div(debt)
        .toNumber() * 100
    ).toFixed(2);
  }

  async getLiquidationPrice() {
    const [liquidationRatio, debt, collateral] = await Promise.all([
      this._cdpType.getLiquidationRatio(),
      this.getDebtValue(),
      this.getCollateralValue()
    ]);
    return debt
      .times(liquidationRatio)
      .div(collateral)
      .toNumber()
      .toFixed(2);
  }

  async isSafe() {
    const [liqPrice, ethPrice] = await Promise.all([
      this.getLiquidationPrice(),
      this._cdpType.getPrice()
    ]);
    return ethPrice.gte(liqPrice);
  }

  async getLockedCollateral() {
    const [debt, liquidationRatio, price] = await Promise.all([
      this.getDebtValue(),
      this._cdpType.getLiquidationRatio(),
      this._cdpType.getPrice()
    ]);
    return (debt.toNumber() * (liquidationRatio / 100)) / price.toNumber();
  }

  async getFreeCollateral() {
    const [collateral, lockedCollateral] = await Promise.all([
      this.getCollateralValue(),
      this.getLockedCollateral()
    ]);
    return collateral.toNumber() - lockedCollateral;
  }

  async daiAvailable() {
    const [collateral, price, liquidationRatio, debt] = await Promise.all([
      this.getCollateralValue(),
      this._cdpType.getPrice(),
      this._cdpType.getLiquidationRatio(),
      this.getDebtValue()
    ]);
    return (
      collateral.times(price).toNumber() / liquidationRatio -
      debt.toNumber()
    ).toFixed(2);
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
