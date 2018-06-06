import PrivateService from '../core/PrivateService';
import contracts from '../../contracts/contracts';

export default class GovernanceService extends PrivateService {
  constructor(name = 'governance') {
    super(name, ['smartContract']);
  }

  _tubContract() {
    if (!this._tubContractCache) {
      this._tubContractCache = this.get('smartContract').getContractByName(
        contracts.SAI_TUB
      );
    }
    return this._tubContractCache;
  }

  _set(key, value) {
    const hexKey = this.get('smartContract').stringToBytes32(key);
    return this._tubContract().mold(hexKey, value);
  }

  setLiquidationRatio(value) {
    return this._set('mat', value);
  }

  getLiquidationRatio() {
    return this._tubContract().mat();
  }

  setDebtCeiling(value) {
    return this._set('cap', value);
  }

  getDebtCeiling() {
    return this._tubContract().cap();
  }

  setStabilityFee(value) {
    return this._set('tax', value);
  }

  getStabilityFee() {
    return this._tubContract().tax();
  }

  setGovernanceFee(value) {
    return this._set('fee', value);
  }

  getGovernanceFee() {
    return this._tubContract().fee();
  }

  setLiquidationPenalty(value) {
    return this._set('axe', value);
  }

  getLiquidationPenalty() {
    return this._tubContract().axe();
  }

  setBoomBustSpread(value) {
    return this._set('gap', value);
  }

  getBoomBustSpread() {
    return this._tubContract().gap();
  }

  getSettings() {}
}
