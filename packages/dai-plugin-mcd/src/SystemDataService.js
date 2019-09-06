import { PublicService } from '@makerdao/services-core';
import { RAD, RAY, ServiceRoles, SECONDS_PER_YEAR } from './constants';
const { CDP_TYPE } = ServiceRoles;
import BigNumber from 'bignumber.js';

export default class SystemDataService extends PublicService {
  constructor(name = ServiceRoles.SYSTEM_DATA) {
    super(name, ['smartContract', 'token', CDP_TYPE]);
  }

  async getAnnualBaseRate() {
    const base = await this.jug.base();
    const baseBigNumber = new BigNumber(base.toString()).dividedBy(RAY).plus(1);
    return baseBigNumber
      .pow(SECONDS_PER_YEAR)
      .minus(1)
      .toNumber();
  }

  async getSystemWideDebtCeiling() {
    const Line = await this.vat.Line();
    return new BigNumber(Line.toString()).dividedBy(RAD).toNumber();
  }

  //this should equal the total dai supply as long as we account for all cdpTypes/ilks
  get totalDebtAllCdpTypes() {
    const debts = this.get(CDP_TYPE).cdpTypes.map(ilk => {
      return ilk.totalDebt;
    });
    return debts.reduce((a, b) => a.plus(b));
  }

  adapterAddress(ilk) {
    const key = 'MCD_JOIN_' + ilk.replace(/-/g, '_');
    return this.get('smartContract').getContractAddress(key);
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
