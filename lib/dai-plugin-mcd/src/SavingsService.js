import { PublicService } from '@makerdao/services-core';
import { ServiceRoles } from './constants';
import { MDAI } from './index';
import BigNumber from 'bignumber.js'
import { RAY, WAD } from './constants'

export default class SavingsService extends PublicService {
  constructor(name = ServiceRoles.SAVINGS) {
    super(name, ['smartContract', 'accounts', ServiceRoles.SYSTEM_DATA]);
  }

  async join(amountInDai) {
    await this.ensureDaiCanBeMoved()
    const chi = await this._chi()
    const amount = amountInDai.toBigNumber().div(chi)
    return await this._pot.join(MDAI(amount).toFixed('wei'))
  }

  async exit(amountInDai) {
    await this.ensureDaiCanBeMoved()
    const chi = await this._chi()
    const amount = MDAI(amountInDai.toBigNumber().div(chi)).toFixed('wei')
    return await this._pot.exit(amount)
  }

  async balance(guy) {
    const amount = new BigNumber(await this._pot.pie(guy)).div(WAD)
    const chi = await this._chi()
    return MDAI(amount.times(chi))
  }

  async getTotalDai() {
    const totalPie = new BigNumber(await this._pot.Pie()).div(WAD)
    const chi = await this._chi()
    return MDAI(totalPie.times(chi))
  }

  async getDaiSavingsRate() {
    const dsr = await this._pot.dsr()
    return new BigNumber(dsr).div(RAY)
  }

  async _chi() {
    return new BigNumber(await this._pot.chi()).div(RAY)
  }

  async canMoveDaiOnBehalfOf(userAddress) {
    const can = await this._vat.can(userAddress, this._potAddress)

    return can.toNumber() !== 0
  }

  async ensureDaiCanBeMoved() {
    const currentAddress = this.get('accounts').currentAddress()
    const can = await this.canMoveDaiOnBehalfOf(currentAddress)

    if (!can) await this._vat.hope(this._potAddress)
  }

  get _vat() {
    return this.get(ServiceRoles.SYSTEM_DATA).vat
  }

  get _pot() {
    return this.get('smartContract').getContractByName('MCD_POT');
  }

  get _potAddress() {
    return this.get('smartContract').getContractAddress('MCD_POT');
  }
}
