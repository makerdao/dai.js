import Maker from '@makerdao/dai';
import CdpType from './CdpType';

export default class CdpTypeService extends Maker.PublicService {
  constructor(name = 'cdpType') {
    super(name, ['smartContract']);
  }

  initialize(settings = {}) {
    this._cdpTypes = (settings.cdpTypes || []).map(ilk =>
      new CdpType(this.get('smartContract'), ilk.currency)
    );
  }

  getCdpType(currency) {
    return this._cdpTypes.find(t => t.currency === currency);
  }

  listCdpTypes() {
    return this._cdpTypes.map(i => i.ilkId);
  }
}
