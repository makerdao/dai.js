import { PrivateService } from '@makerdao/services-core';
import { POLLING, BATCH_POLLING } from './utils/constants';
import { MKR } from './utils/constants';
import { fromBuffer, toBuffer, paddedArray } from './utils/helpers';
import { rankedChoiceIRV } from './utils/irv';
import tracksTransactions from './utils/tracksTransactions';

const POSTGRES_MAX_INT = 2147483647;

export default class GovPollingService extends PrivateService {
  constructor(name = 'govPolling') {
    super(name, [
      'smartContract',
      'govQueryApi',
      'token',
      'chief',
      'voteProxy',
      'voteDelegate'
    ]);
  }

  @tracksTransactions
  async createPoll(startDate, endDate, multiHash, url, { promise }) {
    const txo = await this._pollingContract().createPoll(
      startDate,
      endDate,
      multiHash,
      url,
      { promise }
    );
    const pollId = parseInt(txo.receipt.logs[0].topics[2]);
    return pollId;
  }

  withdrawPoll(pollId) {
    return this._pollingContract().withdrawPoll(pollId);
  }

  vote(pollIds, options) {
    if (pollIds.length !== options.length || pollIds.length === 0)
      throw new Error(
        'poll id array and option id array must be the same length and have a non-zero number of elements'
      );

    const optionIds = options.map(option => {
      if (!Array.isArray(option)) return option;
      if (option.length === 1) return option[0];
      const byteArray = new Uint8Array(32);
      option.forEach((optionIndex, i) => {
        byteArray[byteArray.length - i - 1] = optionIndex;
      });
      return fromBuffer(byteArray).toString();
    });

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

  voteLegacy(pollId, optionId) {
    return this._pollingContract().vote(pollId, optionId);
  }

  voteRankedChoiceLegacy(pollId, rankings) {
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

  _batchPollingContract() {
    return this.get('smartContract').getContractByName(BATCH_POLLING);
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
        blockTimestamp: o.blockTimestamp,
        rankedChoiceOption
      };
    });
  }

  async getAllOptionsVotingForMany(addresses) {
    const formattedAddresses = addresses.map(a => `"${a.toLowerCase()}"`);
    const options = await this.get('govQueryApi').getAllOptionsVotingForMany(
      formattedAddresses
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
        voter: o.voter,
        pollId: o.pollId,
        option: o.optionId,
        blockTimestamp: o.blockTimestamp,
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
    const { hasDelegate, voteDelegate } = await this.get(
      'voteDelegate'
    ).getVoteDelegate(address);

    let balancePromises = [
      this.get('token')
        .getToken(MKR)
        .balanceOf(address),
      this.get('chief').getNumDeposits(address)
    ];

    // TODO: is this correct calc?
    if (hasDelegate) {
      const delegateAddress = voteDelegate.getVoteDelegateAddress();
      balancePromises = balancePromises.concat([
        this.get('token')
          .getToken(MKR)
          .balanceOf(delegateAddress),
        this.get('chief').getNumDeposits(delegateAddress)
      ]);
      const balances = await Promise.all(balancePromises);
      const total = balances.reduce((total, num) => total.plus(num), MKR(0));
      return {
        mkrBalance: balances[0],
        chiefBalance: balances[1],
        linkedMkrBalance: null,
        linkedChiefBalance: null,
        proxyChiefBalance: null,
        total
      };
    }

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
    const poll = await this._getPoll(pollId);
    if (!poll) return null;
    const endUnix = Math.floor(poll.endDate / 1000);
    const weights = await this.get('govQueryApi').getMkrSupport(
      pollId,
      endUnix
    );
    return MKR(weights.reduce((acc, cur) => acc + cur.mkrSupport, 0));
  }

  async getMkrAmtVotedRankedChoice(pollId) {
    const poll = await this._getPoll(pollId);
    if (!poll) return null;
    const endUnix = Math.floor(poll.endDate / 1000);
    const weights = await this.get('govQueryApi').getMkrSupportRankedChoice(
      pollId,
      endUnix
    );
    return MKR(
      weights.reduce((acc, cur) => acc + parseFloat(cur.mkrSupport), 0)
    );
  }

  async getMkrAmtVotedByAddress(pollId) {
    const poll = await this._getPoll(pollId);
    if (!poll) return [];
    const endUnix = Math.floor(poll.endDate / 1000);
    const results = await this.get('govQueryApi').getMkrSupportByAddress(
      pollId,
      endUnix
    );
    if (!results) return [];
    const votes = results.map(vote => {
      let rankedChoiceOption = null;
      if (vote.optionIdRaw) {
        const ballotBuffer = toBuffer(vote.optionIdRaw, { endian: 'little' });
        const ballot = paddedArray(32 - ballotBuffer.length, ballotBuffer);
        rankedChoiceOption = ballot
          .reverse()
          .filter(choice => choice !== 0 && choice !== '0');
      }
      return {
        ...vote,
        rankedChoiceOption
      };
    });
    return votes;
  }

  async getTallyRankedChoiceIrv(pollId) {
    const poll = await this._getPoll(pollId);
    if (!poll) return {};
    const endUnix = Math.floor(poll.endDate / 1000);
    const votes = await this.get('govQueryApi').getMkrSupportRankedChoice(
      pollId,
      endUnix
    );
    return this.runoff(votes);
  }

  runoff(votes) {
    return rankedChoiceIRV(votes);
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
    const poll = await this._getPoll(pollId);
    if (!poll) return null;
    const endUnix = Math.floor(poll.endDate / 1000);
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

  // --- cache queries for networks without Spock, e.g. the testchain

  async getVoteLogs(fromBlock = 0, toBlock = 'latest') {
    const web3 = this.get('smartContract').get('web3');
    return web3.getPastLogs({
      address: this._batchPollingContract().address,
      toBlock,
      fromBlock
    });
  }

  async getCompletedPolls(address) {
    let polls = [];
    const logs = await this.getVoteLogs();

    logs.map(log => {
      if (`0x${log.topics[1].slice(-40)}` === address) {
        const option = parseInt(log.topics[3]);
        let rankedChoiceOption = [];
        if (option > 100)
          rankedChoiceOption = this._decodeRankedChoiceOptions(log.topics[3]);
        polls.push({
          pollId: parseInt(log.topics[2]),
          option,
          rankedChoiceOption
        });
      }
    });

    return polls;
  }

  _decodeRankedChoiceOptions(options) {
    let rankedChoiceOption = [];
    options = options.match(/.{1,2}/g).reverse();
    options.map(choice => {
      choice = parseInt(choice);
      if (choice > 0) rankedChoiceOption.push(choice);
    });

    return rankedChoiceOption;
  }
}
