import Maker from '@makerdao/dai';
import CdpType from './CdpType';
import { ServiceRoles } from './constants';
const { CDP_TYPE, SYSTEM_DATA } = ServiceRoles;

export default class CdpTypeService extends Maker.PublicService {
  constructor(name = CDP_TYPE) {
    super(name, [SYSTEM_DATA]);
  }

  initialize(settings = {}) {
    this._cdpTypes = (settings.cdpTypes || []).map(
      ilk => new CdpType(this.get(SYSTEM_DATA), ilk.currency)
    );
  }

  getCdpType(currency) {
    return this._cdpTypes.find(t => t.currency === currency);
  }

  listCdpTypes() {
    return this._cdpTypes.map(i => i.ilkId);
  }
}
