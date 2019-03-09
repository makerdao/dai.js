import { PublicService } from '@makerdao/services-core';

export default class GasEstimatorService extends PublicService {
  constructor(name = 'gasEstimator') {
    super(name, ['web3', 'log']);
    this._percentage = 1.55;
    this._absolute = null;
  }

  async estimateGasLimit(transaction, options = {}) {
    let web3Data;
    try {
      console.log('transaction:', transaction);
      console.log('options:', options);
      web3Data = await Promise.all([
        this.get('web3').getBlock('latest'),
        this.get('web3').estimateGas(transaction)
      ]);
    } catch (err) {
      console.error(err);
    }

    const blockLimit = web3Data[0].gasLimit;
    const estimate = web3Data[1];

    if (this._percentage === null && this._absolute !== null) {
      options.gasLimit = Math.min(this._absolute, blockLimit);
    } else if (this._absolute === null) {
      options.gasLimit = Math.min(
        parseInt(estimate * this._percentage),
        blockLimit
      );
    } else {
      options.gasLimit = Math.min(
        parseInt(estimate * this._percentage),
        this._absolute,
        blockLimit
      );
    }

    return options;
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
