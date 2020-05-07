import { PrivateService } from '@makerdao/services-core';
import { POLLING } from './utils/constants';
import { MKR } from './utils/constants';
import BigNumber from 'bignumber.js';
import { fromBuffer, toBuffer, paddedArray } from './utils/helpers';

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

  voteRankedChoice(pollId, rankings) {
    const byteArray = new Uint8Array(32);
    rankings.forEach((optionIndex, i) => {
      byteArray[byteArray.length - i - 1] = optionIndex + 1;
    });
    const optionId = fromBuffer(byteArray).toString();
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

  async getOptionVotingForRankedChoice(address, pollId) {
    const optionIdRaw = await this.get(
      'govQueryApi'
    ).getOptionVotingForRankedChoice(address.toLowerCase(), pollId);
    if (!optionIdRaw) return [];
    const ballotBuffer = toBuffer(optionIdRaw, { endian: 'little' });
    const ballot = paddedArray(32 - ballotBuffer.length, ballotBuffer);
    return ballot.reverse().filter(choice => choice !== 0 && choice !== '0');
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

  async getTallyRankedChoiceIrv(pollId) {
    const { endDate } = await this._getPoll(pollId);
    const endUnix = Math.floor(endDate / 1000);
    const votes = await this.get('govQueryApi').getMkrSupportRankedChoice(
      pollId,
      endUnix
    );
    const totalMkrParticipation = votes.reduce(
      (acc, cur) => BigNumber(cur.mkrSupport || 0).plus(acc),
      BigNumber(0)
    );

    const tally = {
      rounds: 1,
      winner: null,
      totalMkrParticipation,
      options: {}
    };
    const defaultOptionObj = {
      firstChoice: BigNumber(0),
      transfer: BigNumber(0),
      winner: false,
      eliminated: false
    };

    // run the first round
    votes.forEach(vote => {
      vote.choice = vote.ballot.pop();
      if (!tally.options[vote.choice])
        tally.options[vote.choice] = { ...defaultOptionObj };

      tally.options[vote.choice].firstChoice = BigNumber(
        tally.options[vote.choice].firstChoice
      ).plus(vote.mkrSupport || 0);
    });

    // does any candidate have the majority after the first round?
    Object.entries(tally.options).forEach(([option, { firstChoice }]) => {
      if (firstChoice.gt(totalMkrParticipation.div(2))) tally.winner = option;
    });

    // if so, we're done. Return the winner
    if (tally.winner) {
      tally.options[tally.winner].winner = true;
      return tally;
    }

    // if we couldn't find a winner based on first preferences, run additionaly irv rounds until we find one
    while (!tally.winner) {
      tally.rounds++;

      // eliminate the weakest candidate
      const [optionToEliminate] = Object.entries(tally.options).reduce(
        (prv, cur) => {
          const [, prvVotes] = prv;
          const [, curVotes] = cur;
          if (
            curVotes.firstChoice
              .add(curVotes.transfer)
              .lt(prvVotes.firstChoice.add(prvVotes.transfer))
          )
            return cur;
          return prv;
        }
      );

      tally.options[optionToEliminate].eliminated = true;
      tally.options[optionToEliminate].transfer = BigNumber(0);

      // a vote needs to be moved if...
      // 1) it's currently for the eliminated candidate
      // 2) there's another choice further down in the voter's preference list
      const votesToBeMoved = votes
        .filter(vote => vote.choice === optionToEliminate)
        .filter(vote => vote.ballot[vote.ballot.length - 1] !== '0');

      // move votes to the next choice on their preference list
      votesToBeMoved.forEach(vote => {
        vote.choice = vote.ballot.pop();
        tally.options[vote.choice].transfer = BigNumber(
          tally.options[vote.choice].transfer
        ).plus(vote.mkrSupport || 0);
      });

      // look for a candidate with the majority
      Object.entries(tally.options).forEach(
        ([option, { firstChoice, transfer }]) => {
          if (firstChoice.add(transfer).gt(totalMkrParticipation.div(2)))
            tally.winner = option;
        }
      );

      // sanity checks
      if (Object.keys(tally.options).length === 2) {
        // dead tie. this seems super unlikely, but it should be here for completeness
        // return the tally without declaring a winner
        return tally;
      }
      if (Object.keys(tally.options).length === 1) {
        // this shouldn't happen
        throw new Error(`Invalid ranked choice tally ${tally.options}`);
      }

      // if we couldn't find one, go for another round
    }

    tally.options[tally.winner].winner = true;
    return tally;
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
