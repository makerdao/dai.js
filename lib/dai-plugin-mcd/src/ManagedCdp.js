import { castAsCurrency, getIlkForCurrency } from './utils';
import { ServiceRoles } from './constants';
import ethAbi from 'web3-eth-abi';
import assert from 'assert';
import { MDAI } from './index';

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
    const art = MDAI.wei((await this._urnInfo()).art);
    return art.times(rate).shiftedBy(-27);
  }

  async lockCollateral(amount) {
    return this.lockAndDraw(amount);
  }

  async drawDai(amount) {
    return this.lockAndDraw(undefined, amount);
  }

  async lockAndDraw(lockAmount = this.currency(0), drawAmount = MDAI(0)) {
    assert(lockAmount && drawAmount, 'amounts must be defined');
    lockAmount = castAsCurrency(lockAmount, this.currency);
    drawAmount = castAsCurrency(drawAmount, MDAI);
    return this._cdpManager.lockAndDraw(lockAmount, drawAmount, this.id);
  }

  async wipeDai(amount) {
    return this.wipeAndFree(amount);
  }

  async freeCollateral(amount) {
    return this.wipeAndFree(undefined, amount);
  }

  async wipeAndFree(wipeAmount = MDAI(0), freeAmount = this.currency(0)) {
    assert(wipeAmount && freeAmount, 'amounts must be defined');
    wipeAmount = castAsCurrency(wipeAmount, MDAI);
    freeAmount = castAsCurrency(freeAmount, this.currency);
    return this._cdpManager.wipeAndFree(wipeAmount, freeAmount, this.id);
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
