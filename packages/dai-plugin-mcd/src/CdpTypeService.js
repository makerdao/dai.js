import { PublicService } from '@makerdao/services-core';
import CdpType from './CdpType';
import { ServiceRoles } from './constants';
import assert from 'assert';
import { toHex } from './utils/ethereum';
import isEqual from 'lodash/isEqual';
import set from 'lodash/set';
import uniqWith from 'lodash/uniqWith';
const { CDP_TYPE, SYSTEM_DATA, QUERY_API } = ServiceRoles;

export default class CdpTypeService extends PublicService {
  constructor(name = CDP_TYPE) {
    super(name, [SYSTEM_DATA, QUERY_API]);
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

  useMulticall(watcher) {
    this.cdpTypes.forEach(type => this.useMulticallForType(watcher, type));
  }

  useMulticallForType(watcher, cdpType) {
    const { ilk } = cdpType;
    const systemData = this.get(SYSTEM_DATA);
    const scs = systemData.get('smartContract');
    const schema = [
      {
        target: scs.getContractAddress('MCD_JUG'),
        call: ['ilks(bytes32)(uint256,uint48)', toHex(ilk)],
        returns: [[`ilk.${ilk}.jug.duty`], [`ilk.${ilk}.jug.rho`]]
      },
      {
        target: scs.getContractAddress('MCD_VAT'),
        call: [
          'ilks(bytes32)(uint256,uint256,uint256,uint256,uint256)',
          toHex(ilk)
        ],
        returns: [
          [`ilk.${ilk}.vat.Art`],
          [`ilk.${ilk}.vat.rate`],
          [`ilk.${ilk}.vat.spot`],
          [`ilk.${ilk}.vat.line`],
          []
        ]
      },
      {
        target: scs.getContractAddress('MCD_SPOT'),
        call: ['ilks(bytes32)(address,uint256)', toHex(ilk)],
        returns: [[`ilk.${ilk}.spot.pip`], [`ilk.${ilk}.spot.mat`]]
      },
      {
        target: scs.getContractAddress('MCD_CAT'),
        call: ['ilks(bytes32)(address,uint256,uint256)', toHex(ilk)],
        returns: [
          [`ilk.${ilk}.cat.flip`],
          [`ilk.${ilk}.cat.chop`],
          [`ilk.${ilk}.cat.lump`]
        ]
      },
      {
        target: scs.getContractAddress(cdpType.currency.symbol),
        call: [
          'balanceOf(address)(uint256)',
          systemData.adapterAddress(cdpType.ilk)
        ],
        returns: [[`ilk.${ilk}.adapterBalance`]]
      },
      {
        target: scs.getContractAddress('MCD_SPOT'),
        call: ['par()(uint256)'],
        returns: [['system.par']]
      }
    ];

    watcher.batch().subscribe(updates => {
      const ilkUpdates = updates.filter(u => u.type.startsWith(`ilk.${ilk}.`));
      for (let update of ilkUpdates) {
        const [, , group, key] = update.type.split('.');

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
      if (parUpdate) cdpType.cache.par = parUpdate.value;
    });

    watcher.tap(model => uniqWith(model.concat(schema), isEqual));
  }
}
