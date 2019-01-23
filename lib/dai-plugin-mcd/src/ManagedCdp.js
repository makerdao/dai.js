import { getIlkForCurrency } from './utils';
import { ServiceRoles } from './constants';
import Maker from '@makerdao/dai';
import ethAbi from 'web3-eth-abi';
import assert from 'assert';
const { getCurrency, DAI } = Maker;

export default class ManagedCdp {
  constructor(id, currency, cdpManager) {
    this.id = id;
    assert(currency, 'Must specify collateral type');
    this.currency = currency;
    this._cdpManager = cdpManager;
  }

  async getCollateralValue() {
    return this.currency.wei((await this._urnInfo()).ink);
  }

  async getDebtValue() {
    const cdpType = this._cdpManager
      .get(ServiceRoles.CDP_TYPE)
      .getCdpType(this.currency);
    const { rate } = await cdpType.ilkInfo();
    const art = Maker.DAI.wei((await this._urnInfo()).art);
    return art.times(rate).shiftedBy(-27);
  }

  async lockCollateral(amount) {
    return this.lockAndDraw(amount);
  }

  async drawDai(amount) {
    return this.lockAndDraw(null, amount);
  }

  async lockAndDraw(lockAmount, drawAmount) {
    if (lockAmount) {
      if (typeof lockAmount === 'string' || typeof lockAmount === 'number') {
        lockAmount = this.currency(lockAmount);
      }
      assert(
        lockAmount.symbol === this.currency.symbol,
        `Can't lock ${lockAmount.symbol} in a ${this.currency.symbol} CDP`
      );
    } else {
      lockAmount = this.currency(0);
    }

    if (drawAmount) {
      drawAmount = getCurrency(drawAmount, DAI);
    }

    return this._cdpManager.lockAndDraw(lockAmount, drawAmount, this.id);
  }

  async _urnInfo() {
    return this._cdpManager.vat.urns(
      getIlkForCurrency(this.currency),
      this._cdpManager.getUrn(this.id)
    );
  }
}

ManagedCdp.create = function(createTxo, currency, cdpManager) {
  const sig = ethAbi.encodeEventSignature('NewCdp(address,address,bytes12)');
  const log = createTxo.receipt.logs.find(l => l.topics[0] === sig);
  const id = parseInt(log.data.substring(2, 26), 16);
  return new ManagedCdp(id, currency, cdpManager);
};
