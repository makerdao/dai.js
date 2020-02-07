import { PublicService } from '@makerdao/services-core';
import { PAUSE } from './utils/constants';
import DsSpellAbi from '../contracts/abis/DSSpell.json';
import padStart from 'lodash/padStart';
import assert from 'assert';

const PAUSE_EXEC_METHOD_SIG =
  '0x168ccd6700000000000000000000000000000000000000000000000000000000';
const DS_PAUSE_DEPLOY_BLOCK = 8928171;

export default class SpellService extends PublicService {
  constructor(name = 'spell') {
    super(name, ['smartContract', 'web3']);
    this.eta = {};
    this.done = {};
    this.action = {};
    this.executionDate = {};
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

  async getAction(spellAddress) {
    if (this.action[spellAddress]) return this.action[spellAddress];
    const spell = this.get('smartContract').getContractByAddressAndAbi(
      spellAddress,
      DsSpellAbi
    );
    this.action[spellAddress] = spell.action();
    return this.action[spellAddress];
  }

  async getExecutionDate(spellAddress) {
    if (this.executionDate[spellAddress])
      return this.executionDate[spellAddress];
    const done = await this.getDone(spellAddress);
    assert(done, `spell ${spellAddress} has not been executed`);
    const pauseAddress = this._pauseContract().address;
    const web3Service = this.get('web3');
    const paddedSpellAddress =
      '0x' + padStart(spellAddress.replace(/^0x/, ''), 64, '0');
    const [execEvent] = await web3Service.getPastLogs({
      fromBlock: DS_PAUSE_DEPLOY_BLOCK,
      toBlock: 'latest',
      address: pauseAddress,
      topics: [PAUSE_EXEC_METHOD_SIG, paddedSpellAddress]
    });
    const { timestamp } = await web3Service.getBlock(execEvent.blockNumber);
    return timestamp;
  }

  refresh() {
    this.delay = null;
    this.eta = {};
    this.done = {};
    this.executionDate = {};
  }

  _pauseContract() {
    return this.get('smartContract').getContractByName(PAUSE);
  }
}
