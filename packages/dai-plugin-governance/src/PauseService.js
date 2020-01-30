import { PublicService } from '@makerdao/services-core';
import { PAUSE } from './utils/constants';
import DsSpellAbi from '../contracts/abis/DSSpell.json';

export default class PauseService extends PublicService {
  constructor(name = 'pause') {
    super(name, ['smartContract', 'web3']);
  }

  getDelayInSeconds() {
    if (this.delay) return this.delay;
    this.delay = this._pauseContract().delay();
    return this.delay;
  }

  async getEta(spellAddress) {
    const spell = this.get('smartContract').getContractByAddressAndAbi(
      spellAddress,
      DsSpellAbi
    );
    const eta = await spell.eta();
    return new Date(eta.toNumber() * 1000);
  }

  refresh() {
    this.delay = null;
  }

  _pauseContract() {
    return this.get('smartContract').getContractByName(PAUSE);
  }
}
