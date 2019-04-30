import { PublicService } from '@makerdao/services-core';
import { map } from 'lodash';
import fetch from 'isomorphic-fetch';

export default class GasService extends PublicService {
  constructor(name = 'gas') {
    super(name, ['web3', 'log']);
    this._fallback = 4000000;
    this._multiplier = 1.55;
    this._transactionSpeed = 'fast';
  }

  initialize(settings) {
    if (settings) {
      this._parseConfig(settings.limit, 'limit');
      this._parseConfig(settings.price, 'price');
    }

    this._gasStationDataPromise = this.disablePrice
      ? Promise.resolve({})
      : this.fetchGasStationData();
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
      this.disablePrice = true;
    }
  }

  async getGasPrice(txSpeed) {
    if (this.price) return this.price;
    const speedSetting = txSpeed ? txSpeed : this.transactionSpeed;
    const gasStationData = await this._gasStationDataPromise;
    const price = this.get('web3')._web3.utils.toWei(
      (gasStationData[speedSetting] / 10).toString(),
      'gwei'
    );

    return price;
  }

  async getWaitTime(txSpeed) {
    const speedSetting = txSpeed ? txSpeed : this.transactionSpeed;
    const gasStationData = await this._gasStationDataPromise;

    return gasStationData[`${speedSetting}Wait`];
  }

  async estimateGasLimit(transaction) {
    if (this.limit) return this.limit;
    if (this.disableLimit) return this.fallback;

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
