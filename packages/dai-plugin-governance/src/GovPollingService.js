import { PrivateService } from '@makerdao/services-core';
import { POLLING } from './utils/constants';
import { MKR } from './utils/constants';

const POSTGRES_MAX_INT = 2147483647;

export default class GovPollingService extends PrivateService {
  constructor(name = 'govPolling') {
    super(name, ['smartContract', 'govQueryApi', 'token']);
  }

  async createPoll(startDate, endDate, multiHash, url) {
    const txo = await this._pollingContract().createPoll(
      startDate,
      endDate,
      multiHash,
      url
    );
    const pollId = parseInt(txo.receipt.logs[0].topics[2]);
    return pollId;
  }

  withdrawPoll(pollId) {
    return this._pollingContract().withdrawPoll(pollId);
  }

  vote(pollId, optionId) {
    return this._pollingContract().vote(pollId, optionId);
  }

  _pollingContract() {
    return this.get('smartContract').getContractByName(POLLING);
  }

  //--- cache queries

  async getPoll(multiHash) {
    const polls = await this.getAllWhitelistedPolls();
    const filtered = polls.filter(p => p.multiHash === multiHash);
    let lowest = Infinity;
    let lowestPoll;
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].pollId < lowest) {
        lowest = filtered[i].pollId;
        lowestPoll = filtered[i];
      }
    }
    return lowestPoll;
  }

  async _getPoll(pollId) {
    const polls = await this.getAllWhitelistedPolls();
    return polls.find(p => parseInt(p.pollId) === parseInt(pollId));
  }

  async getAllWhitelistedPolls() {
    if (this.polls) return this.polls;
    this.polls = await this.get('govQueryApi').getAllWhitelistedPolls();
    return this.polls;
  }

  refresh() {
    this.polls = null;
  }

  async getOptionVotingFor(address, pollId) {
    return this.get('govQueryApi').getOptionVotingFor(
      address.toLowerCase(),
      pollId
    );
  }

  async getNumUniqueVoters(pollId) {
    return this.get('govQueryApi').getNumUniqueVoters(pollId);
  }

  async getMkrWeight(address) {
    const weight = await this.get('govQueryApi').getMkrWeight(
      address.toLowerCase(),
      POSTGRES_MAX_INT
    );
    return MKR(weight);
  }

  async getMkrAmtVoted(pollId) {
    const { endDate } = await this._getPoll(pollId);
    const endUnix = Math.floor(endDate / 1000);
    const weights = await this.get('govQueryApi').getMkrSupport(
      pollId,
      endUnix
    );
    return MKR(weights.reduce((acc, cur) => acc + cur.mkrSupport, 0));
  }

  async getPercentageMkrVoted(pollId) {
    const [voted, total] = await Promise.all([
      this.getMkrAmtVoted(pollId),
      this.get('token')
        .getToken(MKR)
        .totalSupply()
    ]);
    return voted
      .div(total)
      .times(100)
      .toNumber();
  }

  async getWinningProposal(pollId) {
    const { endDate } = await this._getPoll(pollId);
    const endUnix = Math.floor(endDate / 1000);
    const currentVotes = await this.get('govQueryApi').getMkrSupport(
      pollId,
      endUnix
    );
    let max = currentVotes[0];
    for (let i = 1; i < currentVotes.length; i++) {
      if (currentVotes[i].mkrSupport > max.mkrSupport) {
        max = currentVotes[i];
      }
    }
    return max ? max.optionId : 0;
  }
}
