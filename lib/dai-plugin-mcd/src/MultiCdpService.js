import Maker from '@makerdao/dai';
import { ServiceRoles } from './constants';
import MultiCdpHandler from './MultiCdpHandler';

export default class MultiCdpService extends Maker.LocalService {
  constructor(name = ServiceRoles.MULTI_CDP) {
    super(name, ['smartContract', 'accounts']);
  }

  openMultiCdp() {
    return new MultiCdpHandler();
  }

  getCount() {
    const address = this.get('accounts').currentAddress();
    return this._registry.getCount(address);
  }

  get _registry() {
    return this.get('smartContract').getContractByName(
      'MCD_CDP_REGISTRY'
    );
  }

  _cdpLib() {
    return this.get('smartContract').getContractByName(
      'MCD_CDP_LIB'
    );
  }
}
