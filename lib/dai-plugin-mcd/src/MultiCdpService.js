import Maker from '@makerdao/dai';
import { ServiceRoles } from './constants';
import MultiCdpHandler from './MultiCdpHandler';

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
}
