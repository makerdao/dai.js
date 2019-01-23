import Maker from '@makerdao/dai';
import { ServiceRoles } from './constants';
import assert from 'assert';
import ManagedCdp from './ManagedCdp';
import { getIlkForCurrency } from './utils';
import { padStart } from 'lodash';
const { DAI, ETH } = Maker;
const { CDP_MANAGER, CDP_TYPE, SYSTEM_DATA } = ServiceRoles;

export default class CdpManager extends Maker.LocalService {
  constructor(name = CDP_MANAGER) {
    super(name, ['smartContract', CDP_TYPE, SYSTEM_DATA, 'accounts', 'proxy']);
  }

  async open(collateralType) {
    await this.get('proxy').ensureProxy();
    const op = this.proxyActions.open(
      this._contractAddress('MCD_CDP_MANAGER'),
      { dsProxy: true }
    );
    return ManagedCdp.create(await op, collateralType, this);
  }

  // collateral type is determined by lockAmount currency type
  async openLockAndDraw(lockAmount, drawAmount) {
    await this.get('proxy').ensureProxy();

    let op;
    if (ETH.isInstance(lockAmount)) {
      op = this._lockETHAndDraw(lockAmount, drawAmount);
    } else {
      op = this._lockGemAndDraw(lockAmount, drawAmount);
    }

    return ManagedCdp.create(await op, lockAmount.type, this);
  }

  async lockAndDraw(lockAmount, drawAmount, cdpId) {
    if (ETH.isInstance(lockAmount)) {
      return this._lockETHAndDraw(lockAmount, drawAmount, cdpId);
    } else {
      return this._lockGemAndDraw(lockAmount, drawAmount, cdpId);
    }
  }

  // with later revisions of DssCdpManager, `collateralType` may no longer be
  // necessary; in that case, we will read from the contract to determine the
  // ilk for an ID
  getCdp(id, collateralType) {
    return new ManagedCdp(id, collateralType, this);
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

  _gemContractAddress(collateralType) {
    let gemName;
    switch (collateralType.symbol) {
      case 'REP':
      case 'DGX':
        gemName = 'MCD_JOIN_' + collateralType.symbol;
        break;
      default:
        assert(false, `unrecognized currency type "${collateralType}"`);
    }
    return this._contractAddress(gemName);
  }

  _lockETHAndDraw(lockAmount, drawAmount = DAI(0), cdpId) {
    const args = [
      this._contractAddress('MCD_CDP_MANAGER'),
      this._contractAddress('MCD_JOIN_ETH'),
      this._contractAddress('MCD_JOIN_DAI'),
      this._contractAddress('MCD_PIT'),
      cdpId && this.getIdBytes(cdpId),
      drawAmount.toEthersBigNumber('wei'),
      {
        dsProxy: true,
        value: lockAmount.toEthersBigNumber('wei')
      }
    ].filter(x => x);

    const method = cdpId ? 'lockETHAndDraw' : 'openLockETHAndDraw';
    return this.proxyActions[method](...args);
  }

  _lockGemAndDraw(lockAmount, drawAmount = DAI(0), cdpId) {
    const args = [
      this._contractAddress('MCD_CDP_MANAGER'),
      this._gemContractAddress(lockAmount),
      this._contractAddress('MCD_JOIN_DAI'),
      this._contractAddress('MCD_PIT'),
      cdpId && this.getIdBytes(cdpId),
      getIlkForCurrency(lockAmount),
      lockAmount.toEthersBigNumber('wei'),
      drawAmount.toEthersBigNumber('wei'),
      { dsProxy: true }
    ].filter(x => x);

    const method = cdpId ? 'lockGemAndDraw' : 'openLockGemAndDraw';
    return this.proxyActions[method](...args);
  }
}
