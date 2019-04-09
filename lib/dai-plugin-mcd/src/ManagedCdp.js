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
      .getCdpType(this.currency, this.ilk);
    const { rate } = await cdpType.ilkInfo();
    const art = MDAI.wei((await this._urnInfo()).art);
    return art.times(rate).shiftedBy(-27);
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
    const urn = await this._cdpManager.getUrn(this.id);
    return this._cdpManager.vat.urns(
      stringToBytes(this.ilk),
      urn
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
