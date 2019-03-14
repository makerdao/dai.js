import { PublicService } from '@makerdao/services-core';

export default class GasEstimatorService extends PublicService {
  constructor(name = 'gasEstimator') {
    super(name, ['web3', 'log']);
    this._multiplier = 1.55;
    this._absolute = null;
    this._fallback = 4000000;
  }

  async estimateGasLimit(transaction) {
    let web3Data = [];
    try {
      web3Data = await Promise.all([
        this.get('web3').getBlock('latest'),
        this.get('web3').estimateGas(transaction)
      ]);
    } catch (err) {
      return this._fallback;
    }

    const blockLimit = web3Data[0].gasLimit;
    const estimate = web3Data[1];

    if (!this.multiplier && !this.absolute) {
      return Math.min(this._absolute, blockLimit);
    } else if (!this._absolute) {
      return Math.min(parseInt(estimate * this._multiplier), blockLimit);
    } else {
      return Math.min(
        parseInt(estimate * this._multiplier),
        this._absolute,
        blockLimit
      );
    }
  }

  get multiplier() {
    return this._multiplier;
  }

  set multiplier(number) {
    if (number <= 0) {
      throw new Error('gas limit multiplier must be greater than 0');
    }
    this._multiplier = number;
  }

  get absolute() {
    return this._absolute;
  }

  set absolute(number) {
    if (number <= 0) {
      throw new Error('gas limit must be greater than 0');
    }

    this._absolute = number;
  }

  get fallback() {
    return this._fallback;
  }

  set fallback(number) {
    if (number <= 0) {
      throw new Error('gas limit fallback must be greater than 0');
    }

    this._fallback = number;
  }

  removeMultiplier() {
    this._multiplier = null;
  }

  removeAbsolute() {
    this._absolute = null;
  }

  removeFallback() {
    this._fallback = null;
  }
}
