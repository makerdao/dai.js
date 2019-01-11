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
    const txo = await this.proxyActions.open(
      this._contractAddress('MCD_CDP_MANAGER'),
      { dsProxy: true }
    );

    const log = txo.receipt.logs.find(
      l =>
        l.topics[0] ===
        this._ethAbi.encodeEventSignature('NewCdp(address,address,bytes12)')
    );
    const id = parseInt(log.data.substring(2, 26), 16);
    return new ManagedCdp(id, null, this);
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

    const txo = await op;

    // HMM getting the id this way seems kind of janky
    const vatLog = txo.receipt.logs.find(
      ({ address }) =>
        address.toLowerCase() === this._contractAddress('MCD_VAT')
    );

    // this is the value of the `urn` argument to frob in frob.sol
    const urn = vatLog.topics[2].toLowerCase();
    assert(urn.substring(0, 42) == this._contractAddress('MCD_CDP_MANAGER'));
    const id = parseInt(urn.substring(42), 16);

    return new ManagedCdp(id, lockAmount.constructor, this);
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

  get vat() {
    return this.get('smartContract').getContract('MCD_VAT');
  }

  get _ethAbi() {
    return this.get('smartContract').get('web3')._web3.eth.abi;
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
