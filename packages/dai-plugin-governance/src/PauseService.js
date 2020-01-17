import { PublicService } from '@makerdao/services-core';
import { PAUSE } from './utils/constants';

export default class PauseService extends PublicService {
  constructor(name = 'pause') {
    super(name, ['smartContract', 'web3']);
  }

  getDelayInSeconds() {
      return this._pauseContract().delay();
  }

  _pauseContract() {
    return this.get('smartContract').getContractByName(PAUSE);
  }
}
