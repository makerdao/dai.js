import { PublicService } from '@makerdao/services-core';
import CdpType from './CdpType';
import { ServiceRoles } from './constants';
import assert from 'assert';
const { CDP_TYPE, SYSTEM_DATA, QUERY_API } = ServiceRoles;
import * as math from './math';

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

  async connect() {
    if (this.settings.prefetch) {
      await Promise.all(this.cdpTypes.map(type => type.prefetch()));
    }
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

  async resetAllCdpTypes() {
    await Promise.all(
      this.cdpTypes.map(async cdpType => {
        await this.getCdpType(null, cdpType.ilk).reset();
      })
    );
  }

  async prefetchAllCdpTypes() {
    await Promise.all(
      this.cdpTypes.map(async cdpType => {
        await this.getCdpType(null, cdpType.ilk).prefetch();
      })
    );
  }

  //todo: this should probably be moved to the system data service, but need to resolve circular dependency between cdpTypeService and SystemDataService first
  //this should equal the total dai supply as long as we account for all cdpTypes/ilks
  get totalDebtAllCdpTypes() {
    const debts = this.cdpTypes.map(ilk => {
      return ilk.totalDebt;
    });
    return debts.reduce((a, b) => a.plus(b));
  }

  //todo: this should probably be moved to the system data service, but need to resolve circular dependency between cdpTypeService and SystemDataService first
  get totalCollateralValueAllCdpTypes() {
    const collateralValues = this.cdpTypes.map(ilk => {
      return ilk.totalCollateral.times(ilk.price);
    });
    return collateralValues.reduce((a, b) => a.plus(b));
  }

  get totalCollateralizationRatioAllCdpTypes() {
    return math.collateralizationRatio(
      this.totalCollateralValueAllCdpTypes,
      this.totalDebtAllCdpTypes
    );
  }
}
