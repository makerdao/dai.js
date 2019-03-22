import { PublicService } from '@makerdao/services-core';
import { map } from 'lodash';
import fetch from 'isomorphic-fetch';

export default class GasEstimatorService extends PublicService {
  constructor(name = 'gasEstimator') {
    super(name, ['web3', 'log']);
    this._fallback = 4000000;
    this._multiplier = 1.55;
    this._transactionSpeed = 'fast';
  }

  initialize(settings) {
    this._gasStationDataPromise = this.fetchGasStationData();

    if (settings) {
      this._parseConfig(settings.gasLimit, 'gasLimit');
      this._parseConfig(settings.gasPrice, 'gasPrice');
    }
  }

  _parseConfig(settings = 'default', label) {
    return settings === 'default' || typeof settings === 'object'
      ? this._setProperties(settings, label)
      : (this[label] = settings);
  }

  _setProperties(settings, label) {
    if (settings === 'default') return;

    return map(settings, (value, key) => {
      if (key === 'disable') {
        this[
          'disable' + label.charAt(0).toUpperCase() + label.slice(1)
        ] = value;
      } else {
        this[key] = value;
      }
    });
  }

  async fetchGasStationData() {
    try {
      const response = await fetch(
        'https://ethgasstation.info/json/ethgasAPI.json'
      );
      return response.json();
    } catch (err) {
      console.error('Error fetching gas data; disabling preset gas price');
      this.disableGasPrice = true;
    }
  }

  async getGasPrice(txSpeed) {
    if (this.gasPrice) return this.gasPrice;
    const speedSetting = txSpeed ? txSpeed : this.transactionSpeed;
    const gasStationData = await this._gasStationDataPromise;

    return gasStationData[speedSetting];
  }

  async getWaitTime(txSpeed) {
    const speedSetting = txSpeed ? txSpeed : this.transactionSpeed;
    const gasStationData = await this._gasStationDataPromise;

    return gasStationData[`${speedSetting}Wait`];
  }

  async estimateGasLimit(transaction) {
    if (this.gasLimit) return this.gasLimit;
    if (this.disableGasLimit) return this.fallback;

    let web3Data = [];
    try {
      web3Data = await Promise.all([
        this.get('web3').getBlock('latest'),
        this.get('web3').estimateGas(transaction)
      ]);
    } catch (err) {
      return this.fallback;
    }

    const blockLimit = web3Data[0].gasLimit;
    const estimate = web3Data[1];

    if (!this.multiplier && !this.absolute) {
      return Math.min(this.absolute, blockLimit);
    } else if (!this.absolute) {
      return Math.min(parseInt(estimate * this.multiplier), blockLimit);
    } else {
      return Math.min(
        parseInt(estimate * this.multiplier),
        this.absolute,
        blockLimit
      );
    }
  }

  get multiplier() {
    return this._multiplier;
  }

  set multiplier(number) {
    if (number <= 0) {
      throw new Error('Gas limit multiplier must be greater than 0');
    }

    this._multiplier = number;
  }

  get absolute() {
    return this._absolute;
  }

  set absolute(number) {
    if (number <= 0) {
      throw new Error('Absolute gas limit must be greater than 0');
    }

    this._absolute = number;
  }

  get fallback() {
    return this._fallback;
  }

  set fallback(number) {
    if (number <= 0) {
      throw new Error('Fallback gas limit must be greater than 0');
    }

    this._fallback = number;
  }

  get transactionSpeed() {
    return this._transactionSpeed;
  }

  set transactionSpeed(speed) {
    const validKeys = ['average', 'fast', 'fastest', 'safeLow'];
    if (!validKeys.includes(speed)) {
      throw new Error(`Invalid transaction speed -- options are ${validKeys}`);
    }

    this._transactionSpeed = speed;
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
