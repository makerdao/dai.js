import Maker from '@makerdao/dai';
import CdpType from './CdpType';
import { ServiceRoles } from './constants';
import assert from 'assert';
const { CDP_TYPE, SYSTEM_DATA } = ServiceRoles;

export default class CdpTypeService extends Maker.PublicService {
  constructor(name = CDP_TYPE) {
    super(name, [SYSTEM_DATA]);
  }

  initialize(settings = {}) {
    this._cdpTypes = (settings.cdpTypes || []).map(
      cdpType => new CdpType(this.get(SYSTEM_DATA), cdpType)
    );
  }

  getCdpType(currency, ilk) {
    const types = this._cdpTypes.filter(
      t => (!currency || t.currency === currency) && (!ilk || ilk === t.ilk)
    );
    if (types.length === 1) return types[0];

    const label = [
      currency && `currency ${currency.symbol}`,
      ilk && `ilk ${ilk}`
    ]
      .filter(x => x)
      .join(', ');

    assert(types.length <= 1, `${label} matches more than one cdp type`);
    assert(types.length > 0, `${label} matches no cdp type`);
  }
}
