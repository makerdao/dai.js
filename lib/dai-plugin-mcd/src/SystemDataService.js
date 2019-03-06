import Maker from '@makerdao/dai';
import { ServiceRoles } from './constants';
import { RAD, RAY } from '@makerdao/dai/utils/constants';
import BigNumber from 'bignumber.js';

export default class SystemDataService extends Maker.PublicService {
  constructor(name = ServiceRoles.SYSTEM_DATA) {
    super(name, ['smartContract']);
  }

  async getAnnualBaseRate() {
    const repo = await this.jug.repo();
    const repoBigNumber = new BigNumber(repo.toString()).dividedBy(RAY).plus(1);
    const secondsPerYear = 60 * 60 * 24 * 365;
    BigNumber.config({ POW_PRECISION: 100 });
    return repoBigNumber.pow(secondsPerYear).minus(1).toNumber();
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
