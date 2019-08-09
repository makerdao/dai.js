import { PublicService } from '@makerdao/services-core';
import CdpType from './CdpType';
import { ServiceRoles } from './constants';
import assert from 'assert';
import isEqual from 'lodash/isEqual';
import set from 'lodash/set';
import uniqWith from 'lodash/uniqWith';
const { CDP_TYPE, SYSTEM_DATA, QUERY_API } = ServiceRoles;
import { createSchema } from './CdpTypeService/multicall';

export default class CdpTypeService extends PublicService {
  constructor(name = CDP_TYPE) {
    super(name, [SYSTEM_DATA, QUERY_API, 'multicall']);
  }

  initialize(settings = {}) {
    this.settings = settings;
    this.cdpTypes = (settings.cdpTypes || []).map(
      cdpType => new CdpType(this, cdpType, { prefetch: settings.prefetch })
    );
  }

  getCdpType(currency, ilk) {
    const types = this.cdpTypes.filter(
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

  useMulticall() {
    const schema = createSchema(this);
    const { watcher } = this.get('multicall');

    watcher.batch().subscribe(updates => {
      const ilkUpdates = updates.filter(u => u.type.startsWith('ilk.'));
      for (let update of ilkUpdates) {
        const [, ilk, group, key] = update.type.split('.');
        const cdpType = this.getCdpType(null, ilk);

        if (key) {
          set(cdpType.cache, [group + 'Info', key], update.value);
        } else {
          switch (group) {
            case 'adapterBalance':
              cdpType.cache[group] = update.value;
              break;
            default:
              throw new Error(`Don't know how to handle "${group}"`);
          }
        }
      }

      const parUpdate = updates.find(u => u.type === 'system.par');
      if (parUpdate) {
        this.cdpTypes.forEach(type => {
          type.cache.par = parUpdate.value;
        });
      }
    });

    watcher.tap(model => uniqWith(model.concat(schema), isEqual));
  }
}
