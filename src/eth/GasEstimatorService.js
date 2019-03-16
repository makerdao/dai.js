import { PrivateService } from '@makerdao/services-core';
import fetch from 'isomorphic-fetch';

export default class GasEstimatorService extends PrivateService {
  constructor(name = 'gasEstimator') {
    super(name, ['web3', 'log']);
    this._multiplier = 1.55;
    this._absolute = null;
  }

  // account for network in gas station call
  // rework config api for top level gasPrice and gasLimit options
  // override options
  // use wait times returned from gas station to resend tx after some amount of time with higher gas price
  // use the same nonce from initial tx (cache somewhere) in resent tx

  authenticate() {
    const settings = this.get('web3').transactionSettings();
    this._gasStationData = this.fetchGasStationData();
    this.transactionSpeed = this._setProperty('transactionSpeed', 'fast');
    this.fallback =
      settings && settings.gasLimit ? settings.gasLimit : this._setProperty('fallback', 4000000);
    this.multiplier = this._setProperty('multiplier', 1.55);
    this.absolute = this._setProperty('absolute', null);
  }

  _setProperty(prop, fallback) {
    const settings = this.get('web3').transactionSettings();
    let value = fallback;

    if (settings && settings[prop]) {
      value = settings[prop];
      // this won't be necessary when options are moved to top level (out of txSettings)
      delete settings[prop];
    }

    return value;
  }

  async fetchGasStationData() {
    const response = await fetch(
      'https://ethgasstation.info/json/ethgasAPI.json'
    );
    return response.json();
  }

  async getGasPrice(txSpeed) {
    const speedSetting = txSpeed ? txSpeed : this.transactionSpeed;
    const gasStationData = await this.gasStationData;

    return gasStationData[speedSetting];
  }

  async getWaitTime(txSpeed) {
    const speedSetting = txSpeed ? txSpeed : this.transactionSpeed;
    const gasStationData = await this.gasStationData;

    return gasStationData[`${speedSetting}Wait`];
  }

  async estimateGasLimit(transaction) {
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

  get gasStationData() {
    return this._gasStationData;
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
