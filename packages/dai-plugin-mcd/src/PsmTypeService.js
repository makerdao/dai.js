import assert from 'assert';

import { PublicService } from '@makerdao/services-core';
import { ServiceRoles } from './constants';
import PsmType from './PsmType';
const { PSM_TYPE, SYSTEM_DATA } = ServiceRoles;

export default class PsmService extends PublicService {
  constructor(name = PSM_TYPE) {
    super(name, [SYSTEM_DATA]);
    this.reset = this.resetAllPsmTypes;
  }

  initialize(settings = {}) {
    this.settings = settings;
    this.psmTypes = (settings.psmTypes || []).map(
      psmType => new PsmType(this, psmType, { prefetch: settings.prefetch })
    );
  }

  async connect() {
    if (this.settings.prefetch) await this.prefetchAllPsmTypes();
  }

  getPsmType(currency, ilk) {
    const types = this.psmTypes.filter(
      t =>
        (!currency || t.currency.symbol === currency.symbol) &&
        (!ilk || ilk === t.ilk)
    );
    if (types.length === 1) return types[0];

    const label = [
      currency && `currency ${currency.symbol}`,
      ilk && `ilk ${ilk}`
    ]
      .filter(x => x)
      .join(', ');

    assert(types.length <= 1, `${label} matches more than one psm type`);
    assert(types.length > 0, `${label} matches no psm type`);
  }

  async prefetchAllPsmTypes() {
    await Promise.all(this.psmTypes.map(type => type.prefetch()));
  }
}
