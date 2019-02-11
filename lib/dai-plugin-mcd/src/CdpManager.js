import Maker from '@makerdao/dai';
import { ServiceRoles } from './constants';
import assert from 'assert';
import ManagedCdp from './ManagedCdp';
import { castAsCurrency, getIlkForCurrency } from './utils';
import { padStart } from 'lodash';
import { MDAI } from './index';
const { Currency, ETH } = Maker;
const { CDP_MANAGER, CDP_TYPE, SYSTEM_DATA } = ServiceRoles;

export default class CdpManager extends Maker.LocalService {
  constructor(name = CDP_MANAGER) {
    super(name, ['smartContract', CDP_TYPE, SYSTEM_DATA, 'accounts', 'proxy']);
  }

  // with later revisions of DssCdpManager, `currency` may no longer be
  // necessary; in that case, we will read from the contract to determine the
  // ilk for an ID
  getCdp(id, currency) {
    return new ManagedCdp(id, currency, this);
  }

  async open(currency) {
    await this.get('proxy').ensureProxy();
    const op = this.proxyActions.open(
      this._contractAddress('MCD_CDP_MANAGER'),
      { dsProxy: true }
    );
    return ManagedCdp.create(await op, currency, this);
  }

  // collateral type is determined by lockAmount currency type
  async openLockAndDraw(lockAmount, drawAmount) {
    const op = this.lockAndDraw(lockAmount, drawAmount, null, true);
    return ManagedCdp.create(await op, lockAmount.type, this);
  }

  async lockAndDraw(lockAmount, drawAmount, id, open) {
    if (lockAmount)
      assert(
        lockAmount instanceof Currency,
        'lockAmount must be a Currency value'
      );
    if (drawAmount) drawAmount = castAsCurrency(drawAmount, MDAI);
    assert(id || open, 'Must pass true as fourth argument to open a new CDP');
    await this.get('proxy').ensureProxy();
    const method = ETH.isInstance(lockAmount)
      ? '_lockETHAndDraw'
      : '_lockGemAndDraw';
    return this[method](lockAmount, drawAmount, id);
  }

  async wipeAndFree(wipeAmount = MDAI(0), freeAmount, id) {
    await this.get('proxy').ensureProxy();

    const isEth = ETH.isInstance(freeAmount);
    const method = isEth ? 'wipeAndFreeETH' : 'wipeAndFreeGem';
    return this.proxyActions[method](
      ...[
        this._contractAddress('MCD_CDP_MANAGER'),
        this._adapterAddress(freeAmount),
        this._adapterAddress(MDAI),
        this._contractAddress('MCD_PIT'),
        this.getIdBytes(id),
        !isEth && getIlkForCurrency(freeAmount),
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

  _adapterAddress(currency) {
    let key;
    switch (currency.symbol) {
      case 'REP':
      case 'DGX':
      case 'ETH':
        key = 'MCD_JOIN_' + currency.symbol;
        break;
      case 'MDAI':
        key = 'MCD_JOIN_DAI';
        break;
      default:
        assert(false, `unrecognized currency type "${currency}"`);
    }
    return this._contractAddress(key);
  }

  async _lockETHAndDraw(lockAmount, drawAmount = MDAI(0), id) {
    assert(lockAmount && drawAmount, 'both amounts must be specified');
    const args = [
      this._contractAddress('MCD_CDP_MANAGER'),
      this._adapterAddress(lockAmount),
      this._adapterAddress(MDAI),
      this._contractAddress('MCD_PIT'),
      id && this.getIdBytes(id),
      drawAmount.toEthersBigNumber('wei'),
      {
        dsProxy: true,
        value: lockAmount.toEthersBigNumber('wei')
      }
    ].filter(x => x);

    const method = id ? 'lockETHAndDraw' : 'openLockETHAndDraw';
    return this.proxyActions[method](...args);
  }

  async _lockGemAndDraw(lockAmount, drawAmount = MDAI(0), id) {
    assert(lockAmount && drawAmount, 'both amounts must be specified');
    const args = [
      this._contractAddress('MCD_CDP_MANAGER'),
      this._adapterAddress(lockAmount),
      this._adapterAddress(MDAI),
      this._contractAddress('MCD_PIT'),
      id && this.getIdBytes(id),
      getIlkForCurrency(lockAmount),
      lockAmount.toEthersBigNumber('wei'),
      drawAmount.toEthersBigNumber('wei'),
      { dsProxy: true }
    ].filter(x => x);

    const method = id ? 'lockGemAndDraw' : 'openLockGemAndDraw';
    return this.proxyActions[method](...args);
  }
}
