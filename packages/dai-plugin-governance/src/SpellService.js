import { PublicService } from '@makerdao/services-core';
import { PAUSE } from './utils/constants';
import DsSpellAbi from '../contracts/abis/DSSpell.json';
import padStart from 'lodash/padStart';
import assert from 'assert';
import contractInfo from '../contracts/contract-info.json';
const pauseInfo = contractInfo.pause;
import { netIdToName } from './utils/helpers';

export default class SpellService extends PublicService {
  constructor(name = 'spell') {
    super(name, ['smartContract', 'web3']);
    this.eta = {};
    this.done = {};
    this.action = {};
    this.executionDate = {};
    this.scheduledDate = {};
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
    if (!eta.toNumber()) return undefined;
    this.eta[spellAddress] = new Date(eta.toNumber() * 1000);
    return this.eta[spellAddress];
  }

  async getScheduledDate(spellAddress) {
    if (this.scheduledDate[spellAddress])
      return this.scheduledDate[spellAddress];
    const eta = await this.getEta(spellAddress);
    assert(eta, `spell ${spellAddress} has not been scheduled`);
    const pauseAddress = this._pauseContract().address;
    const web3Service = this.get('web3');
    const netId = web3Service.network;
    const networkName = netIdToName(netId);
    const paddedSpellAddress =
      '0x' + padStart(spellAddress.replace(/^0x/, ''), 64, '0');
    const [plotEvent] = await web3Service.getPastLogs({
      fromBlock: pauseInfo.inception_block[networkName],
      toBlock: 'latest',
      address: pauseAddress,
      topics: [pauseInfo.events.plot, paddedSpellAddress]
    });
    const { timestamp } = await web3Service.getBlock(plotEvent.blockNumber);
    this.scheduledDate[spellAddress] = new Date(timestamp * 1000);
    return this.scheduledDate[spellAddress];
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
    const netId = web3Service.network;
    const networkName = netIdToName(netId);
    const paddedSpellAddress =
      '0x' + padStart(spellAddress.replace(/^0x/, ''), 64, '0');
    const [execEvent] = await web3Service.getPastLogs({
      fromBlock: pauseInfo.inception_block[networkName],
      toBlock: 'latest',
      address: pauseAddress,
      topics: [pauseInfo.events.exec, paddedSpellAddress]
    });
    const { timestamp } = await web3Service.getBlock(execEvent.blockNumber);
    this.executionDate[spellAddress] = new Date(timestamp * 1000);
    return this.executionDate[spellAddress];
  }

  refresh() {
    this.delay = null;
    this.eta = {};
    this.done = {};
    this.executionDate = {};
    this.scheduledDate = {};
  }

  _pauseContract() {
    return this.get('smartContract').getContractByName(PAUSE);
  }
}
