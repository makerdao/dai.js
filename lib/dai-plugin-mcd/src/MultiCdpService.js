import Maker from '@makerdao/dai';
const { utils: { stringToBytes32 } } = Maker;
import { ServiceRoles } from './constants';
import MultiCdpHandler from './MultiCdpHandler';
import assert from 'assert';

export default class MultiCdpService extends Maker.LocalService {
  constructor(name = ServiceRoles.MULTI_CDP) {
    super(name, ['smartContract', 'accounts']);
  }

  openMultiCdp() {
    return MultiCdpHandler.create(this);
  }

  getMultiCdp(address) {
    return new MultiCdpHandler(address);
  }

  getCount() {
    const address = this.get('accounts').currentAddress();
    return this.registry.getCount(address);
  }

  get registry() {
    return this.get('smartContract').getContract('MCD_CDP_REGISTRY');
  }

  get cdpLib() {
    return this.get('smartContract').getContract('MCD_CDP_LIB');
  }

  get vat() {
    return this.get('smartContract').getContract('MCD_VAT');
  }

  ilk(collateralType, convert = true) {
    const ilk = collateralType.symbol;
    assert(ilk, "ilk can't be blank");
    return convert ? stringToBytes32(ilk, false) : ilk;
  }

  getJoinContractAddress(collateralType) {
    switch (collateralType.symbol) {
      case 'ETH':
        return this.getContractAddress('MCD_JOIN_ETH');
      case 'REP':
        return this.getContractAddress('MCD_JOIN_REP');
      default:
        throw new Error('Unsupported collateral type: ' + collateralType);
    }
  }

  getContractAddress(name) {
    return this.get('smartContract').getContractAddress(name);
  }
}
