import { PublicService } from '@makerdao/services-core';
import { PAUSE } from './utils/constants';
import DsSpellAbi from '../contracts/abis/DSSpell.json';

export default class SpellService extends PublicService {
  constructor(name = 'spell') {
    super(name, ['smartContract', 'web3']);
    this.eta = {};
    this.done = {};
  }

  getDelayInSeconds() {
    if (this.delay) return this.delay;
    this.delay = this._pauseContract().delay();
    return this.delay;
  }

  async getEta(spellAddress) {
    if (this.eta[spellAddress]) return this.eta[spellAddress];
    const spell = this.get('smartContract').getContractByAddressAndAbi(
      spellAddress,
      DsSpellAbi
    );
    const eta = await spell.eta();
    this.eta[spellAddress] = new Date(eta.toNumber() * 1000);
    return this.eta[spellAddress];
  }

  async getDone(spellAddress) {
    if (this.done[spellAddress]) return this.done[spellAddress];
    const spell = this.get('smartContract').getContractByAddressAndAbi(
      spellAddress,
      DsSpellAbi
    );
    this.done[spellAddress] = spell.done();
    return this.done[spellAddress];
  }

  refresh() {
    this.delay = null;
    this.eta = {};
    this.done = {};
  }

  _pauseContract() {
    return this.get('smartContract').getContractByName(PAUSE);
  }
}
