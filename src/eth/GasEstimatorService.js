import PublicService from '../core/PublicService';

export default class GasEstimatorService extends PublicService {
  constructor(name = 'gasEstimator') {
    super(name, ['web3', 'log']);
    this._percentage = null;
    this._absolute = null;
  }

  estimateGasLimit(transaction) {
    if (this._percentage === null && this._absolute === null) {
      throw new Error('no gas limit policy set');
    }

    return Promise.all([
      this.get('web3').eth.getBlock('latest'),
      this.get('web3').eth.estimateGas(transaction)
    ]).then(web3Data => {
      const blockLimit = web3Data[0].gasLimit,
        estimate = web3Data[1];

      if (this._percentage === null && this._absolute !== null) {
        return Math.min(this._absolute, blockLimit);
      }

      if (this._absolute === null) {
        return Math.min(estimate * this._percentage, blockLimit);
      }

      return Math.min(estimate * this._percentage, this._absolute, blockLimit);
    });
  }

  setPercentage(number) {
    if (number <= 0) {
      throw new Error('gas limit percentage must be greater than 0');
    }
    this._percentage = number;
  }

  setAbsolute(number) {
    if (number <= 0) {
      throw new Error('gas limit must be greater than 0');
    }

    this._absolute = number;
  }

  removePercentage() {
    this._percentage = null;
  }

  removeAbsolute() {
    this._absolute = null;
  }

  getPercentage() {
    return this._percentage;
  }

  getAbsolute() {
    return this._absolute;
  }
}
