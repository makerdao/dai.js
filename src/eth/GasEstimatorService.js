import { PrivateService } from '@makerdao/services-core';
import fetch from 'isomorphic-fetch';

export default class GasEstimatorService extends PrivateService {
  constructor(name = 'gasEstimator') {
    super(name, ['web3', 'log']);
    this._multiplier = 1.55;
    this._absolute = null;
  }

  // get gas values from gas station in authenticate
  // add that value from buildTransactionOptions in txManager
  // use wait times returned from gas station to resend tx after some amount of time
  // with higher gas price
  // use the same nonce from initial tx (cache somewhere)

  authenticate() {
    const settings = this.get('web3').transactionSettings();
    this._fallback =
      settings && settings.gasLimit ? settings.gasLimit : 4000000;
  }

  async fetchGasPrice() {
    try {
      const res = await fetch('https://ethgasstation.info/json/ethgasAPI.json');
      const gasData = await res.json();
      console.log(gasData);
    } catch (err) {
      console.error(err);
    }
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
