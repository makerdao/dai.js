import Maker from '@makerdao/dai';
import { WAD, RAY } from '@makerdao/dai/utils/constants';
import BigNumber from 'bignumber.js';
import CdpType from './CdpType';

export default class CollateralService extends Maker.PublicService {
  constructor(name = 'collateral') {
    super(name, ['smartContract']);
  }

  initialize(settings = {}) {
    if (settings.cdpTypes) {
      this._cdpTypes = settings.cdpTypes.map(ilk =>
        this.getCdpTypeObject(ilk.currency)
      );
    }
  }

  // System-Wide Data ----------------------------------------------

  async getAnnualSavingsRate() {
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

  // Getting CDPType ojbects -------------------------------------

  //should these be 'get' functions?

  getCdpTypeObject(currency) {
    return new CdpType(this.get('smartContract'), currency);
  }

  listAllCdpTypes() {
    return this._cdpTypes;
  }

  // Helpers ----------------------------------------------

  _dripContract() {
    return this.get('smartContract').getContract('MCD_DRIP');
  }

  _pitContract() {
    return this.get('smartContract').getContract('MCD_PIT');
  }
}
