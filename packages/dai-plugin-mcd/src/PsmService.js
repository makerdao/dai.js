import assert from 'assert';
import { PublicService } from '@makerdao/services-core';
import { ServiceRoles } from './constants';
import tracksTransactions from './utils/tracksTransactions';

export default class PsmService extends PublicService {
  constructor(name = ServiceRoles.PSM) {
    super(name, ['smartContract', 'web3', ServiceRoles.CDP_TYPE]);
  }

  async getFeeIn() {}
  async getFeeOut() {}

  /*
   * gemAmount
   */
  @tracksTransactions
  async join(gemAmount, { promise }) {}

  @tracksTransactions
  async exit(amountInDai, { promise }) {}

  get _psm() {
    return this.get('smartContract').getContract('PSM');
  }
}
