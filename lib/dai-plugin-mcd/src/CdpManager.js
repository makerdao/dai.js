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
      stringToBytes(ilk),
      { dsProxy: true }
    );
    return ManagedCdp.create(await op, ilk, this);
  }

  // ilk is required if the currency type corresponds to more than one ilk; if
  // it's omitted, it is inferred from lockAmount's currency type
  async openLockAndDraw(ilk, lockAmount, drawAmount) {
    const type = this.get(CDP_TYPE).getCdpType(lockAmount.type, ilk);
    const op = this.lockAndDraw(null, type.ilk, lockAmount, drawAmount);
    return ManagedCdp.create(await op, type.ilk, this);
  }

  async lockAndDraw(id, ilk, lockAmount, drawAmount = MDAI(0)) {
    assert(lockAmount && drawAmount, 'both amounts must be specified');
    assert(
      lockAmount instanceof Currency,
      'lockAmount must be a Currency value'
    );
    drawAmount = castAsCurrency(drawAmount, MDAI);
    await this.get('proxy').ensureProxy();
    const isEth = ETH.isInstance(lockAmount);
    const args = [
      this._contractAddress('MCD_CDP_MANAGER'),
      this._adapterAddress(ilk),
      this._adapterAddress('DAI'),
      this._contractAddress('MCD_VAT'),
      id || stringToBytes(ilk),
      !isEth && lockAmount.toEthersBigNumber('wei'),
      drawAmount.toEthersBigNumber('wei'),
      {
        dsProxy: true,
        value: isEth ? lockAmount.toEthersBigNumber('wei') : 0
      }
    ].filter(x => x);

    const method = `${id ? 'lock' : 'openLock'}${isEth ? 'ETH' : 'Gem'}AndDraw`;
    return this.proxyActions[method](...args);
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
        this._contractAddress('MCD_VAT'),
        this.getIdBytes(id),
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
}
