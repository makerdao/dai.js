import { PublicService } from '@makerdao/services-core';
import { ServiceRoles } from './constants';
import PsmType from './PsmType';

const { PSM_TYPE } = ServiceRoles;

export default class PsmService extends PublicService {
  constructor(name = PSM_TYPE) {
    super(name);
    this.reset = this.resetAllPsmTypes;
  }

  initialize(settings = {}) {
    this.settings = settings;
    this.psmTypes = (settings.psmTypes || []).map(
      psmType => new PsmType(this, psmType, { prefetch: settings.prefetch })
    );
  }

  async connect() {
    if (this.settings.prefetch) await this.prefetchAllCdpTypes();
  }

  async prefetchAllPsmTypes() {
    await Promise.all(this.psmTypes.map(type => type.prefetch()));
  }
}
