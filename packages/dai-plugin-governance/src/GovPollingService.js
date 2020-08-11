import { PrivateService } from '@makerdao/services-core';
import { POLLING, BATCH_POLLING } from './utils/constants';
import { MKR } from './utils/constants';
import BigNumber from 'bignumber.js';
import { fromBuffer, toBuffer, paddedArray } from './utils/helpers';

const POSTGRES_MAX_INT = 2147483647;

const MAX_ROUNDS = 32;

export default class GovPollingService extends PrivateService {
  constructor(name = 'govPolling') {
    super(name, [
      'smartContract',
      'govQueryApi',
      'token',
      'chief',
      'voteProxy'
    ]);
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

  vote(pollIds, optionIds) {
    if (pollIds.length !== optionIds.length || pollIds.length === 0)
      throw new Error(
        'poll id array and option id array must be the same length and have a non-zero number of elements'
      );
    if (pollIds.length === 1) {
      const func = 'vote(uint256,uint256)';
      return this._batchPollingContract()[func](pollIds[0], optionIds[0]);
    } else {
      const func = 'vote(uint256[],uint256[])';
      return this._batchPollingContract()[func](pollIds, optionIds);
    }
  }

  voteRankedChoice(pollId, rankings) {
    const byteArray = new Uint8Array(32);
    rankings.forEach((optionIndex, i) => {
      byteArray[byteArray.length - i - 1] = optionIndex + 1;
    });
    const optionId = fromBuffer(byteArray).toString();
    return this._batchPollingContract().vote(pollId, optionId);
  }

  _pollingContract() {
    return this.get('smartContract').getContractByName(POLLING);
  }

  _batchPollingContract() {
    return this.get('smartContract').getContractByName(BATCH_POLLING);
  }

  // For networks without Spock, e.g. the testchain
  async getVoteLogs(from = 0, to = 'latest') {
    const web3 = this.get('smartContract').get('web3');
    return web3.getPastLogs({
      address: this._batchPollingContract().address,
      from,
      to
    });
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

  async getAllOptionsVotingFor(address) {
    const options = await this.get('govQueryApi').getAllOptionsVotingFor(
      address.toLowerCase()
    );
    if (!options) return [];
    return options.map(o => {
      let rankedChoiceOption = null;
      if (o.optionIdRaw) {
        const ballotBuffer = toBuffer(o.optionIdRaw, { endian: 'little' });
        const ballot = paddedArray(32 - ballotBuffer.length, ballotBuffer);
        rankedChoiceOption = ballot
          .reverse()
          .filter(choice => choice !== 0 && choice !== '0');
      }
      return {
        pollId: o.pollId,
        option: o.optionId,
        rankedChoiceOption
      };
    });
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

  async getMkrWeightFromChain(address) {
    const { hasProxy, voteProxy } = await this.get('voteProxy').getVoteProxy(
      address
    );
    let balancePromises = [
      this.get('token')
        .getToken(MKR)
        .balanceOf(address),
      this.get('chief').getNumDeposits(address)
    ];
    if (hasProxy) {
      const otherAddress =
        address.toLowerCase() === voteProxy.getHotAddress().toLowerCase()
          ? voteProxy.getColdAddress()
          : voteProxy.getHotAddress();
      balancePromises = balancePromises.concat([
        this.get('token')
          .getToken(MKR)
          .balanceOf(otherAddress),
        this.get('chief').getNumDeposits(otherAddress),
        this.get('chief').getNumDeposits(voteProxy.getProxyAddress())
      ]);
    }
    const balances = await Promise.all(balancePromises);
    const total = balances.reduce((total, num) => total.plus(num), MKR(0));
    return {
      mkrBalance: balances[0],
      chiefBalance: balances[1],
      linkedMkrBalance: hasProxy ? balances[2] : null,
      linkedChiefBalance: hasProxy ? balances[3] : null,
      proxyChiefBalance: hasProxy ? balances[4] : null,
      total
    };
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

  async getMkrAmtVotedRankedChoice(pollId) {
    const { endDate } = await this._getPoll(pollId);
    const endUnix = Math.floor(endDate / 1000);
    const weights = await this.get('govQueryApi').getMkrSupportRankedChoice(
      pollId,
      endUnix
    );
    return MKR(
      weights.reduce((acc, cur) => acc + parseFloat(cur.mkrSupport), 0)
    );
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

    if (votes.length === 0) {
      return tally;
    }

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
      const filteredOptions = Object.entries(tally.options).filter(
        ([, optionDetails]) => !optionDetails.eliminated
      );

      const [optionToEliminate] = filteredOptions.reduce((prv, cur) => {
        const [, prvVotes] = prv;
        const [, curVotes] = cur;
        if (
          curVotes.firstChoice
            .plus(curVotes.transfer)
            .lt(prvVotes.firstChoice.plus(prvVotes.transfer))
        )
          return cur;
        return prv;
      });

      tally.options[optionToEliminate].eliminated = true;
      tally.options[optionToEliminate].transfer = BigNumber(0);

      // a vote needs to be moved if...
      // 1) it's currently for the eliminated candidate
      // 2) there's another choice further down in the voter's preference list
      const votesToBeMoved = votes
        .map((vote, index) => ({ ...vote, index }))
        .filter(vote => parseInt(vote.choice) === parseInt(optionToEliminate))
        .filter(vote => vote.ballot[vote.ballot.length - 1] !== 0);

      // move votes to the next choice on their preference list
      votesToBeMoved.forEach(vote => {
        votes[vote.index].choice = votes[vote.index].ballot.pop();
        tally.options[votes[vote.index].choice].transfer = BigNumber(
          tally.options[votes[vote.index].choice].transfer
        ).plus(vote.mkrSupport || 0);
      });

      // look for a candidate with the majority
      Object.entries(tally.options).forEach(
        ([option, { firstChoice, transfer }]) => {
          if (firstChoice.plus(transfer).gt(totalMkrParticipation.div(2)))
            tally.winner = option;
        }
      );

      //if there's no more rounds, or if there is one or fewer options that haven't been eliminated
      // the winner is the option with the most votes
      if (
        (tally.rounds > MAX_ROUNDS && !tally.winner) ||
        ((filteredOptions.length === 1 || filteredOptions.length === 0) &&
          !tally.winner)
      ) {
        let max = BigNumber(0);
        let maxOption;
        Object.entries(tally.options).forEach(
          ([option, { firstChoice, transfer }]) => {
            if (firstChoice.plus(transfer).gt(max)) {
              max = firstChoice.plus(transfer);
              maxOption = option;
            }
          }
        );
        tally.winner = maxOption;
      }

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

  async getPercentageMkrVotedRankedChoice(pollId) {
    const [voted, total] = await Promise.all([
      this.getMkrAmtVotedRankedChoice(pollId),
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
