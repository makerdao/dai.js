import { PublicService } from '@makerdao/services-core';
import { ServiceRoles } from './constants';
import { MDAI } from './index';
import BigNumber from 'bignumber.js'
import { RAY, WAD } from './constants'

export default class SavingsService extends PublicService {
  constructor(name = ServiceRoles.SAVINGS) {
    super(name, ['smartContract', 'proxy', 'accounts', ServiceRoles.SYSTEM_DATA]);
  }

  async join(amountInDai) {
    await this.get('proxy').ensureProxy();

    const chi = await this.chi();
    const amount = amountInDai.toBigNumber().div(chi);
    return await this._proxyActions.dsrJoin(
      this._daiAdapterAddress,
      this._potAddress,
      MDAI(amount).toFixed('wei'),
      { dsProxy: true }
    );
  }

  async exit(amountInDai) {
    await this.get('proxy').ensureProxy();

    const chi = await this.chi();
    const amount = amountInDai.toBigNumber().div(chi)
    return await this._proxyActions.dsrExit(
      this._daiAdapterAddress,
      this._potAddress,
      MDAI(amount).toFixed('wei'),
      { dsProxy: true }
    );
  }

  async balance() {
    const proxy = await this.get('proxy').ensureProxy();

    return await this.balanceOf(proxy)
  }

  async balanceOf(guy) {
    const amount = new BigNumber(await this._pot.pie(guy)).div(WAD)
    const chi = await this.chi()
    return MDAI(amount.times(chi))
  }

  async getTotalDai() {
    const totalPie = new BigNumber(await this._pot.Pie()).div(WAD)
    const chi = await this.chi()
    return MDAI(totalPie.times(chi))
  }

  async getDaiSavingsRate() {
    const dsr = await this._pot.dsr()
    return new BigNumber(dsr).div(RAY)
  }

  async chi() {
    return new BigNumber(await this._pot.chi()).div(RAY)
  }

  get _proxyActions() {
    return this.get('smartContract').getContract('PROXY_ACTIONS');
  }

  get _pot() {
    return this.get('smartContract').getContractByName('MCD_POT');
  }

  get _potAddress() {
    return this.get('smartContract').getContractAddress('MCD_POT');
  }

  get _daiAdapterAddress() {
    return this.get(ServiceRoles.SYSTEM_DATA).adapterAddress('DAI');
  }
}
