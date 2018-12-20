import Maker from '@makerdao/dai';
import { ServiceRoles } from './constants';
const {
  utils: { stringToBytes32 }
} = Maker;
import assert from 'assert';
import ManagedCdp from './ManagedCdp';

export default class CdpManager extends Maker.LocalService {
  constructor(name = ServiceRoles.CDP_MANAGER) {
    super(name, ['smartContract', 'accounts', 'proxy']);
  }

  open(collateralType) {
    if (!this.get('proxy').currentProxy()) {
      throw new Error('User has no DSProxy');
    }
  }

  // TODO @tracksTransactions
  async openLockAndDraw(lockAmount, drawAmount) {
    if (!this.get('proxy').currentProxy()) {
      throw new Error('User has no DSProxy');
    }

    let op;

    if (Maker.ETH.isInstance(lockAmount)) {
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
      // TODO
    }

    const txo = await op;

    // HMM getting the id this way seems kind of janky
    const vatLog = txo.receipt.logs.find(
      ({ address }) =>
        address.toLowerCase() === this._contractAddress('MCD_VAT')
    );
    const urn = vatLog.topics[2].toLowerCase();
    assert(urn.substring(0, 42) == this._contractAddress('MCD_CDP_MANAGER'));
    const id = parseInt(urn.substring(42), 16);

    return new ManagedCdp(id, lockAmount.constructor, this, urn);
  }

  ilk(collateralType, convert = true) {
    const ilk = collateralType.symbol;
    assert(ilk, "ilk can't be blank");
    return convert ? stringToBytes32(ilk, false) : ilk;
  }

  // with later revisions of DssCdpManager, `ilk` may no longer be necessary; in
  // that case, we will read from the contract to determine the ilk for an ID
  getCdp(id, ilk) {}

  get proxyActions() {
    return this.get('smartContract').getContract('MCD_PROXY_ACTIONS');
  }

  get vat() {
    return this.get('smartContract').getContract('MCD_VAT');
  }

  _contractAddress(name) {
    return this.get('smartContract').getContractAddress(name);
  }
}
