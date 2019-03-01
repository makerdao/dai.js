import Maker from '@makerdao/dai';
import { ServiceRoles } from './constants';
import assert from 'assert';
import ManagedCdp from './ManagedCdp';
import { castAsCurrency, stringToBytes } from './utils';
import { padStart } from 'lodash';
import { MDAI } from './index';
const { Currency, ETH } = Maker;
const { CDP_MANAGER, CDP_TYPE, SYSTEM_DATA } = ServiceRoles;

export default class CdpManager extends Maker.LocalService {
  constructor(name = CDP_MANAGER) {
    super(name, ['smartContract', CDP_TYPE, SYSTEM_DATA, 'accounts', 'proxy']);
  }

  // with later revisions of DssCdpManager, `ilk` may no longer be necessary; in
  // that case, we will read from the contract to determine the ilk for an ID
  getCdp(id, ilk) {
    return new ManagedCdp(id, ilk, this);
  }

  async open(ilk) {
    await this.get('proxy').ensureProxy();
    const op = this.proxyActions.open(
      this._contractAddress('MCD_CDP_MANAGER'),
      { dsProxy: true }
    );
    return ManagedCdp.create(await op, ilk, this);
  }

  // ilk is required if the currency type corresponds to more than one ilk; if
  // it's omitted, it is inferred from lockAmount's currency type
  async openLockAndDraw(ilk, lockAmount, drawAmount) {
    const type = this.get(CDP_TYPE).getCdpType(lockAmount.type, ilk);
    const op = this.lockAndDraw(null, type.ilkId, lockAmount, drawAmount);
    return ManagedCdp.create(await op, type.ilkId, this);
  }

  async lockAndDraw(id, ilk, lockAmount, drawAmount) {
    if (lockAmount)
      assert(
        lockAmount instanceof Currency,
        'lockAmount must be a Currency value'
      );
    if (drawAmount) drawAmount = castAsCurrency(drawAmount, MDAI);
    await this.get('proxy').ensureProxy();
    const method = ETH.isInstance(lockAmount)
      ? '_lockETHAndDraw'
      : '_lockGemAndDraw';
    return this[method](id, ilk, lockAmount, drawAmount);
  }

  async wipeAndFree(id, ilk, wipeAmount = MDAI(0), freeAmount) {
    await this.get('proxy').ensureProxy();

    const isEth = ETH.isInstance(freeAmount);
    const method = isEth ? 'wipeAndFreeETH' : 'wipeAndFreeGem';
    return this.proxyActions[method](
      ...[
        this._contractAddress('MCD_CDP_MANAGER'),
        this._adapterAddress(ilk),
        this._adapterAddress('DAI'),
        this._contractAddress('MCD_PIT'),
        this.getIdBytes(id),

        // TODO: this arg should always be passed, but the current version of
        // DssProxyActions doesn't support it yet
        !isEth && stringToBytes(ilk),

        freeAmount.toEthersBigNumber('wei'),
        wipeAmount.toEthersBigNumber('wei'),
        { dsProxy: true }
      ].filter(x => x)
    );
  }

  getUrn(id) {
    const myAddress = this._contractAddress('MCD_CDP_MANAGER');
    return '0x' + myAddress.replace(/^0x/, '') + this.getIdBytes(id, false);
  }

  getIdBytes(id, prefix = true) {
    return (prefix ? '0x' : '') + padStart(id.toString(16), 24, '0');
  }

  get proxyActions() {
    return this.get('smartContract').getContract('MCD_PROXY_ACTIONS');
  }

  get vat() {
    return this.get(SYSTEM_DATA).vat;
  }

  _contractAddress(name) {
    return this.get('smartContract').getContractAddress(name);
  }

  _adapterAddress(ilk) {
    let key;
    switch (ilk) {
      case 'REP':
      case 'DGX':
      case 'ETH':
      case 'DAI':
        key = 'MCD_JOIN_' + ilk;
        break;
      default:
        assert(false, `unrecognized ilk "${ilk}"`);
    }
    return this._contractAddress(key);
  }

  async _lockETHAndDraw(id, ilk, lockAmount, drawAmount = MDAI(0)) {
    assert(lockAmount && drawAmount, 'both amounts must be specified');
    const args = [
      this._contractAddress('MCD_CDP_MANAGER'),
      this._adapterAddress(ilk),
      this._adapterAddress('DAI'),
      this._contractAddress('MCD_PIT'),
      id && this.getIdBytes(id),
      false && stringToBytes(ilk), // TODO add ilk arg once the contract supports it
      drawAmount.toEthersBigNumber('wei'),
      {
        dsProxy: true,
        value: lockAmount.toEthersBigNumber('wei')
      }
    ].filter(x => x);

    const method = id ? 'lockETHAndDraw' : 'openLockETHAndDraw';
    return this.proxyActions[method](...args);
  }

  async _lockGemAndDraw(id, ilk, lockAmount, drawAmount = MDAI(0)) {
    assert(lockAmount && drawAmount, 'both amounts must be specified');
    const args = [
      this._contractAddress('MCD_CDP_MANAGER'),
      this._adapterAddress(ilk),
      this._adapterAddress('DAI'),
      this._contractAddress('MCD_PIT'),
      id && this.getIdBytes(id),
      stringToBytes(ilk),
      lockAmount.toEthersBigNumber('wei'),
      drawAmount.toEthersBigNumber('wei'),
      { dsProxy: true }
    ].filter(x => x);

    const method = id ? 'lockGemAndDraw' : 'openLockGemAndDraw';
    return this.proxyActions[method](...args);
  }
}
