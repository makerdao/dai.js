import Maker from '@makerdao/dai';
import { ServiceRoles } from './constants';
import assert from 'assert';
import ManagedCdp from './ManagedCdp';
import { getIlkForCurrency } from './utils';
import { padStart } from 'lodash';
const { ETH } = Maker;

export default class CdpManager extends Maker.LocalService {
  constructor(name = ServiceRoles.CDP_MANAGER) {
    super(name, ['smartContract', 'accounts', 'proxy']);
  }

  async open() {
    assert(this.get('proxy').currentProxy(), 'User has no DSProxy');
    const op = this.proxyActions.open(
      this._contractAddress('MCD_CDP_MANAGER'),
      { dsProxy: true }
    );
    return ManagedCdp.create(await op, null, this);
  }

  // TODO @tracksTransactions
  // collateral type is determined by lockAmount currency type
  async openLockAndDraw(lockAmount, drawAmount) {
    assert(this.get('proxy').currentProxy(), 'User has no DSProxy');

    let op;
    if (ETH.isInstance(lockAmount)) {
      op = this.proxyActions.openLockETHAndDraw(
        this._contractAddress('MCD_CDP_MANAGER'),
        this._contractAddress('MCD_JOIN_ETH'),
        this._contractAddress('MCD_JOIN_DAI'),
        this._contractAddress('MCD_PIT'),
        drawAmount ? drawAmount.toEthersBigNumber('wei') : '0',
        {
          dsProxy: true,
          value: lockAmount.toEthersBigNumber('wei')
        }
      );
    } else {
      op = this.proxyActions.openLockGemAndDraw(
        this._contractAddress('MCD_CDP_MANAGER'),
        this._gemContractAddress(lockAmount),
        this._contractAddress('MCD_JOIN_DAI'),
        this._contractAddress('MCD_PIT'),
        getIlkForCurrency(lockAmount),
        lockAmount.toEthersBigNumber('wei'),
        drawAmount ? drawAmount.toEthersBigNumber('wei') : '0',
        { dsProxy: true }
      );
    }

    return ManagedCdp.create(await op, lockAmount.constructor, this);
  }

  // with later revisions of DssCdpManager, `ilk` may no longer be necessary; in
  // that case, we will read from the contract to determine the ilk for an ID
  getCdp(id, ilk) {}

  getUrn(id) {
    const myAddress = this._contractAddress('MCD_CDP_MANAGER');
    const paddedId = padStart(id.toString(16), 24, '0');
    return '0x' + myAddress.replace(/^0x/, '') + paddedId;
  }

  get proxyActions() {
    return this.get('smartContract').getContract('MCD_PROXY_ACTIONS');
  }

  get pit() {
    return this.get('smartContract').getContract('MCD_PIT');
  }

  get vat() {
    return this.get('smartContract').getContract('MCD_VAT');
  }

  _contractAddress(name) {
    return this.get('smartContract').getContractAddress(name);
  }

  _gemContractAddress(collateralType) {
    let gemName;
    switch (collateralType.symbol) {
      case 'REP':
        gemName = 'MCD_JOIN_REP';
        break;
      default:
        assert(false, `unrecognized currency type "${collateralType}"`);
    }
    return this._contractAddress(gemName);
  }
}
