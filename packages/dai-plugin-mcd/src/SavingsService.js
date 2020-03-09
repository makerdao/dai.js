import { PublicService } from '@makerdao/services-core';
import { ServiceRoles } from './constants';
import { MDAI } from './index';
import BigNumber from 'bignumber.js';
import { RAY, WAD, SECONDS_PER_YEAR } from './constants';
import tracksTransactions from './utils/tracksTransactions';
import { getDsrEventHistory } from './EventHistory';

export default class SavingsService extends PublicService {
  constructor(name = ServiceRoles.SAVINGS) {
    super(name, [
      'smartContract',
      'proxy',
      'accounts',
      'web3',
      ServiceRoles.SYSTEM_DATA
    ]);
  }

  @tracksTransactions
  async join(amountInDai, { promise }) {
    await this.get('proxy').ensureProxy();

    return this._proxyActions.join(
      this._daiAdapterAddress,
      this._pot.address,
      amountInDai.toFixed('wei'),
      { dsProxy: true, promise }
    );
  }

  @tracksTransactions
  async exit(amountInDai, { promise }) {
    await this.get('proxy').ensureProxy();

    return this._proxyActions.exit(
      this._daiAdapterAddress,
      this._pot.address,
      amountInDai.toFixed('wei'),
      { dsProxy: true, promise }
    );
  }

  @tracksTransactions
  async exitAll({ promise }) {
    await this.get('proxy').ensureProxy();

    return this._proxyActions.exitAll(
      this._daiAdapterAddress,
      this._pot.address,
      { dsProxy: true, promise }
    );
  }

  async balance() {
    const proxy = await this.get('proxy').currentProxy();

    return proxy ? this.balanceOf(proxy) : MDAI(0);
  }

  async balanceOf(guy) {
    const slice = new BigNumber(await this._pot.pie(guy));
    const chi = await this.chi();
    return MDAI(
      slice
        .times(chi)
        .div(WAD)
        .dp(18)
    );
  }

  async getTotalDai() {
    const totalPie = new BigNumber(await this._pot.Pie());
    const chi = await this.chi();
    return MDAI(
      totalPie
        .times(chi)
        .div(WAD)
        .dp(18)
    );
  }

  async getYearlyRate() {
    const dsr = new BigNumber(await this._pot.dsr()).div(RAY);
    return dsr.pow(SECONDS_PER_YEAR);
  }

  async chi() {
    return new BigNumber(await this._pot.chi()).div(RAY);
  }

  get _proxyActions() {
    return this.get('smartContract').getContract('PROXY_ACTIONS_DSR');
  }

  get _pot() {
    return this.get('smartContract').getContract('MCD_POT');
  }

  get _daiAdapterAddress() {
    return this.get(ServiceRoles.SYSTEM_DATA).adapterAddress('DAI');
  }

  getEventHistory(address) {
    if (!this._eventHistoryCache) this._eventHistoryCache = {};
    return getDsrEventHistory(this, address, this._eventHistoryCache);
  }

  async getEarningsToDate(address) {
    if (!this._eventHistoryCache) this._eventHistoryCache = {};
    const eventHistory = await getDsrEventHistory(
      this,
      address,
      this._eventHistoryCache
    );
    let sum = new BigNumber(0);
    eventHistory.forEach(({ type, amount }) => {
      if (type === 'DSR_DEPOSIT') sum = sum.plus(amount);
      if (type === 'DSR_WITHDRAW') sum = sum.minus(amount);
    });
    const balance = await this.balanceOf(address);
    return balance.gt(sum) ? balance.minus(sum) : MDAI(0);
  }

  resetEventHistoryCache(address = null) {
    if (address !== null) delete this._eventHistoryCache[address];
    else this._eventHistoryCache = {};
  }
}
