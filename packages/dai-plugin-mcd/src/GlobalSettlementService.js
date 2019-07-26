import { PublicService } from '@makerdao/services-core';
import { ServiceRoles } from './constants';

export default class GlobalSettlementService extends PublicService {
  constructor(name = ServiceRoles.GLOBAL_SETTLEMENT) {
    super(name, ['smartContract']);
  }

  async isInProgress() {
    return !(await this._end().live());
  }

  _end() {
    return this.get('smartContract').getContract('MCD_END');
  }
}
