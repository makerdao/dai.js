import Maker from '@makerdao/dai';
import { ServiceRoles } from './constants';
import { WAD, RAY } from '@makerdao/dai/utils/constants';
import BigNumber from 'bignumber.js';

export default class SystemDataService extends Maker.PublicService {
  constructor(name = ServiceRoles.SYSTEM_DATA) {
    super(name, ['smartContract']);
  }

  async getAnnualBaseRate() {
    const repo = await this.jug.repo();
    const repoBigNumber = new BigNumber(repo.toString()).dividedBy(RAY);
    const secondsPerYear = 60 * 60 * 24 * 365;
    BigNumber.config({ POW_PRECISION: 100 });
    return repoBigNumber.pow(secondsPerYear).toNumber();
  }

  async getSystemWideDebtCeiling() {
    const Line = await this.pit.Line();
    return new BigNumber(Line.toString()).dividedBy(WAD).toNumber();
  }

  // Helpers ----------------------------------------------

  get cat() {
    return this.get('smartContract').getContract('MCD_CAT');
  }

  get jug() {
    return this.get('smartContract').getContract('MCD_JUG');
  }

  get pit() {
    return this.get('smartContract').getContract('MCD_PIT');
  }

  get vat() {
    return this.get('smartContract').getContract('MCD_VAT');
  }

  get spot() {
    return this.get('smartContract').getContract('MCD_SPOT');
  }
}
