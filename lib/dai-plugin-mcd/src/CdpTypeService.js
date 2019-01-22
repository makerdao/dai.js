import Maker from '@makerdao/dai';
import CdpType from './CdpType';

export default class CdpTypeService extends Maker.PublicService {
  constructor(name = 'cdpType') {
    super(name, ['smartContract']);
  }

  initialize(settings = {}) {
    if (settings.cdpTypes) {
      this._cdpTypes = settings.cdpTypes.map(ilk =>
        this.getCdpTypeObject(ilk.currency)
      );
    }
  }

  getCdpTypeObject(currency) {
    return new CdpType(this.get('smartContract'), currency);
  }

  listCdpTypes() {
    return this._cdpTypes.map(i => i.ilkId);
  }
}
