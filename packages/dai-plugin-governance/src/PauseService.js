import { PublicService } from '@makerdao/services-core';
import { PAUSE } from './utils/constants';

export default class PauseService extends PublicService {
  constructor(name = 'pause') {
    super(name, ['smartContract', 'web3']);
  }

  getDelayInSeconds() {
    if (this.delay) return this.delay;
    this.delay = this._pauseContract().delay();
    return this.delay;
  }

  refresh() {
    this.delay = null;
  }

  _pauseContract() {
    return this.get('smartContract').getContractByName(PAUSE);
  }
}
