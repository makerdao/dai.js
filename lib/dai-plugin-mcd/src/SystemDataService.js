import Maker from '@makerdao/dai';
import { WAD, RAY } from '@makerdao/dai/utils/constants';
import BigNumber from 'bignumber.js';

export default class SystemDataService extends Maker.PublicService {
  constructor(name = ServiceRoles.SYSTEM_DATA) {
    super(name, ['smartContract']);
  }

  async getAnnualBaseRate() {
    const repo = await this._dripContract().repo();
    const repoBigNumber = new BigNumber(repo.toString()).dividedBy(RAY);
    const secondsPerYear = 60 * 60 * 24 * 365;
    BigNumber.config({ POW_PRECISION: 100 });
    return repoBigNumber.pow(secondsPerYear).toNumber();
  }

  async getSystemWideDebtCeiling() {
    const Line = await this._pitContract().Line();
    return new BigNumber(Line.toString()).dividedBy(WAD).toNumber();
  }

  // Helpers ----------------------------------------------

  _dripContract() {
    return this.get('smartContract').getContract('MCD_DRIP');
  }

  _pitContract() {
    return this.get('smartContract').getContract('MCD_PIT');
  }
}
