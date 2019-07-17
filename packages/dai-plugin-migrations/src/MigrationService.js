import { PublicService } from '@makerdao/services-core';
import { ServiceRoles } from './constants';

export default class MigrationService extends PublicService {
  constructor(name = ServiceRoles.MIGRATION) {
    super(name, ['smartContract']);
  }
}
