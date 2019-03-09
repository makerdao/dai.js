import { PublicService } from '@makerdao/services-core';
import { RAD, RAY, ServiceRoles } from './constants';
import BigNumber from 'bignumber.js';

export default class SystemDataService extends PublicService {
  constructor(name = ServiceRoles.SYSTEM_DATA) {
    super(name, ['smartContract', 'token']);
  }

  async getAnnualBaseRate() {
    const repo = await this.jug.repo();
    const repoBigNumber = new BigNumber(repo.toString()).dividedBy(RAY).plus(1);
    const secondsPerYear = 60 * 60 * 24 * 365;
    BigNumber.config({ POW_PRECISION: 100 });
    return repoBigNumber
      .pow(secondsPerYear)
      .minus(1)
      .toNumber();
  }

  async getSystemWideDebtCeiling() {
    const Line = await this.vat.Line();
    return new BigNumber(Line.toString()).dividedBy(RAD).toNumber();
  }

  // Helpers ----------------------------------------------

  get cat() {
    return this.get('smartContract').getContract('MCD_CAT');
  }

  get jug() {
    return this.get('smartContract').getContract('MCD_JUG');
  }

  get vat() {
    return this.get('smartContract').getContract('MCD_VAT');
  }

  get spot() {
    return this.get('smartContract').getContract('MCD_SPOT');
  }
}
