import { PublicService } from '@makerdao/services-core';
import { ServiceRoles } from './constants';
import { MDAI } from './index';
import BigNumber from 'bignumber.js'
import { RAY, WAD } from './constants'

export default class SavingsService extends PublicService {
  constructor(name = ServiceRoles.SAVINGS) {
    super(name, ['smartContract', 'web3', ServiceRoles.SYSTEM_DATA]);

    this.cache = {
      pot: null,
    }
  }

  async join(amountInDai) {
    const chi = new BigNumber(await this._pot.chi()).div(RAY)
    const amount = amountInDai.toBigNumber().div(chi)
    return await this._pot.join(MDAI(amount).toFixed('wei'))
  }

  async exit(amountInDai) {
    const chi = new BigNumber(await this._pot.chi()).div(RAY)
    const amount = MDAI(amountInDai.toBigNumber().div(chi)).toFixed('wei')
    return await this._pot.exit(amount)
  }

  async balance(guy) {
    const amount = new BigNumber(await this._pot.pie(guy)).div(WAD)
    const chi = new BigNumber(await this._pot.chi()).div(RAY)
    return MDAI(amount * chi)
  }

  async getTotalDai() {
    const amount = await this._pot.Pie()
    return MDAI.wei(amount)
  }

  async getDaiSavingsRate() {
    const dsr = await this._pot.dsr()
    return new BigNumber(dsr).div(RAY)
  }

  get _pot() {
    if (this.cache.pot) return this.cache.pot
    return this.get('smartContract').getContractByName('MCD_POT');
  }
}
