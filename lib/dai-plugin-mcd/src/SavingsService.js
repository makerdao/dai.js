import { PublicService } from '@makerdao/services-core';
import { ServiceRoles } from './constants';
import { MDAI } from './index';

export default class SavingsService extends PublicService {
  constructor(name = ServiceRoles.SAVINGS) {
    super(name, ['smartContract']);

    this.cache = {
      pot: null
    }
  }

  async join(amount) {
    return await this._pot.join(amount.toFixed('wei'))
  }

  async exit(amount) {
    return await this._pot.exit(amount.toFixed('wei'))
  }

  async balance(guy) {
    const amount = await this._pot.pie(guy)
    return MDAI.wei(amount)
  }

  getDaiSavingsRate() {
    return this._pot.dsr()
  }

  get _pot() {
    if (this.cache.pot) return this.cache.pot
    return this.get('smartContract').getContractByName('MCD_POT');
  }
}
