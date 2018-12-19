import Maker from '@makerdao/dai';
const { utils: { stringToBytes32 } } = Maker;
import { ServiceRoles } from './constants';
import assert from 'assert';

export default class MultiCdpService extends Maker.LocalService {
  constructor(name = ServiceRoles.MULTI_CDP) {
    super(name, ['smartContract', 'accounts']);
  }

  get manager() {
    return this.get('smartContract').getContract('MCD_CDP_MANAGER');
  }

  get proxyActions() {
    return this.get('smartContract').getContract('MCD_PROXY_ACTIONS');
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
