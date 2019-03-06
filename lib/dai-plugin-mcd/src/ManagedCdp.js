import { castAsCurrency, stringToBytes } from './utils';
import { ServiceRoles } from './constants';
import ethAbi from 'web3-eth-abi';
import assert from 'assert';
import { MDAI } from './index';

export default class ManagedCdp {
  constructor(id, ilk, cdpManager) {
    this.id = id;

    // TODO we could read CdpManager to figure out ilk if it's not passed
    assert(ilk && typeof ilk === 'string', 'Must specify ilk');
    this.ilk = ilk;

    this._cdpManager = cdpManager;
    this.currency = cdpManager
      .get(ServiceRoles.CDP_TYPE)
      .getCdpType(null, ilk).currency;
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
    return this._cdpManager.lockAndDraw(
      this.id,
      this.ilk,
      lockAmount,
      drawAmount
    );
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
    return this._cdpManager.wipeAndFree(
      this.id,
      this.ilk,
      wipeAmount,
      freeAmount
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
