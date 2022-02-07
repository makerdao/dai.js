import { PublicService } from '@makerdao/services-core';
import assert from 'assert';
import {
  netIdtoSpockUrl,
  netIdtoSpockUrlStaging,
  toBuffer,
  paddedArray
} from './utils/helpers';

export default class QueryApi extends PublicService {
  constructor(name = 'govQueryApi') {
    super(name, ['web3']);
    this.queryPromises = {};
    this.staging = false;
  }

  async getQueryResponse(serverUrl, query) {
    const resp = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query
      })
    });
    const { data } = await resp.json();
    assert(data, `error fetching data from ${serverUrl}`);
    return data;
  }

  async getQueryResponseMemoized(serverUrl, query) {
    let cacheKey = `${serverUrl};${query}`;
    if (this.queryPromises[cacheKey]) return this.queryPromises[cacheKey];
    this.queryPromises[cacheKey] = this.getQueryResponse(serverUrl, query);
    return this.queryPromises[cacheKey];
  }

  initialize(settings) {
    if (settings.staging) {
      this.staging = true;
    }
  }

  connect() {
    const network = this.get('web3').network;
    this.serverUrl = this.staging
      ? netIdtoSpockUrlStaging(network)
      : netIdtoSpockUrl(network);
  }

  async getAllWhitelistedPolls() {
    const query = `{activePolls {
      nodes {
          creator
          pollId
          blockCreated
          startDate
          endDate
          multiHash
          url
        }
      }
    }`;

    const response = await this.getQueryResponse(this.serverUrl, query);
    return response.activePolls.nodes.map(p => {
      p.startDate = new Date(p.startDate * 1000);
      p.endDate = new Date(p.endDate * 1000);
      return p;
    });
  }

  async getNumUniqueVoters(pollId) {
    const query = `{uniqueVoters(argPollId:${pollId}){
      nodes
    }
    }`;

    const response = await this.getQueryResponse(this.serverUrl, query);
    return parseInt(response.uniqueVoters.nodes[0]);
  }

  async getMkrWeight(address, unixTime) {
    const query = `{totalMkrWeightProxyAndNoProxyByAddressAtTime(argAddress: "${address}", argUnix: ${unixTime}){
      nodes {
        address
        weight
      }
    }
    }`;
    const response = await this.getQueryResponse(this.serverUrl, query);
    if (!response.totalMkrWeightProxyAndNoProxyByAddressAtTime.nodes[0])
      return 0;
    return response.totalMkrWeightProxyAndNoProxyByAddressAtTime.nodes[0]
      .weight;
  }

  async getOptionVotingFor(address, pollId) {
    const query = `{
      currentVote(argAddress: "${address}", argPollId: ${pollId}){
        nodes{
          optionId
        }
      }
    }`;
    const response = await this.getQueryResponse(this.serverUrl, query);
    if (!response.currentVote.nodes[0]) return null;
    return response.currentVote.nodes[0].optionId;
  }

  async getAllOptionsVotingFor(address) {
    const query = `{
      allCurrentVotes(argAddress: "${address}"){
        nodes{
          pollId
          optionId
          optionIdRaw
          blockTimestamp
        }
      }
    }`;
    const response = await this.getQueryResponse(this.serverUrl, query);
    if (!response.allCurrentVotes.nodes[0]) return null;
    return response.allCurrentVotes.nodes;
  }

  async getAllOptionsVotingForMany(addresses) {
    const query = `
    {
      allCurrentVotesArray(argAddress: [${addresses}]) {
        nodes {
          voter
          pollId
          optionId
          optionIdRaw
          blockTimestamp
        }
      }
    }
    `;
    const response = await this.getQueryResponse(this.serverUrl, query);
    const votes = response.allCurrentVotesArray.nodes;
    return votes;
  }

  async getOptionVotingForRankedChoice(address, pollId) {
    const query = `{
      currentVoteRankedChoice(argAddress: "${address}", argPollId: ${pollId}){
        nodes{
          optionIdRaw
        }
      }
    }`;
    const response = await this.getQueryResponse(this.serverUrl, query);
    if (!response.currentVoteRankedChoice.nodes[0]) return null;
    return response.currentVoteRankedChoice.nodes[0].optionIdRaw;
  }

  async getBlockNumber(unixTime) {
    const query = `{
      timeToBlockNumber(argUnix: ${unixTime}){
      nodes
    }
    }`;
    const response = await this.getQueryResponseMemoized(this.serverUrl, query);
    return response.timeToBlockNumber.nodes[0];
  }

  async getMkrSupportByAddress(pollId, unixTime) {
    const query = `{voteAddressMkrWeightsAtTime(argPollId: ${pollId}, argUnix: ${unixTime}){
    nodes{
      voter
      optionId
      optionIdRaw
      mkrSupport
    }
  }
  }`;

    const response = await this.getQueryResponse(this.serverUrl, query);
    const results = response.voteAddressMkrWeightsAtTime.nodes;
    return results;
  }

  async getMkrSupportRankedChoice(pollId, unixTime) {
    const query = `{voteMkrWeightsAtTimeRankedChoice(argPollId: ${pollId}, argUnix: ${unixTime}){
      nodes{
        optionIdRaw
        mkrSupport
      }
    }
    }`;
    const response = await this.getQueryResponseMemoized(this.serverUrl, query);

    return response.voteMkrWeightsAtTimeRankedChoice.nodes.map(vote => {
      const ballotBuffer = toBuffer(vote.optionIdRaw, { endian: 'little' });
      const ballot = paddedArray(32 - ballotBuffer.length, ballotBuffer);
      return {
        ...vote,
        ballot
      };
    });
  }

  async getMkrSupport(pollId, unixTime) {
    const query = `{voteOptionMkrWeightsAtTime(argPollId: ${pollId}, argUnix: ${unixTime}){
    nodes{
      optionId
      mkrSupport
    }
  }
  }`;
    const response = await this.getQueryResponseMemoized(this.serverUrl, query);
    let weights = response.voteOptionMkrWeightsAtTime.nodes;
    const totalWeight = weights.reduce((acc, cur) => {
      const mkrSupport = isNaN(parseFloat(cur.mkrSupport))
        ? 0
        : parseFloat(cur.mkrSupport);
      return acc + mkrSupport;
    }, 0);
    return weights.map(o => {
      const mkrSupport = isNaN(parseFloat(o.mkrSupport))
        ? 0
        : parseFloat(o.mkrSupport);
      o.mkrSupport = mkrSupport;
      o.percentage = (100 * mkrSupport) / totalWeight;
      return o;
    });
  }

  async getEsmJoins() {
    const query = `{allEsmJoins {
      nodes {
        txFrom
        txHash
        joinAmount
        blockTimestamp
      }
  }
  }`;
    const response = await this.getQueryResponse(this.serverUrl, query);
    const joins = response.allEsmJoins.nodes;
    return joins;
  }

  async getEsmV2Joins() {
    const query = `{allEsmV2Joins {
      nodes {
        txFrom
        txHash
        joinAmount
        blockTimestamp
      }
  }
  }`;
    const response = await this.getQueryResponse(this.serverUrl, query);
    const joins = response.allEsmV2Joins.nodes;
    return joins;
  }

  async getAllDelegates() {
    const query = `
      {
        allDelegates {
          nodes {
            delegate
            voteDelegate
            blockTimestamp
          }
        }
      }
    `;
    const response = await this.getQueryResponse(this.serverUrl, query);
    const delegates = response.allDelegates.nodes;
    return delegates;
  }

  // Returns a list of delegators that have delegated to the address
  async getMkrLockedDelegate(address, unixtimeStart, unixtimeEnd) {
    const query = `
      {
        mkrLockedDelegate(argAddress: "${address}" unixtimeStart: ${unixtimeStart}, unixtimeEnd: ${unixtimeEnd}) {
          nodes {
            fromAddress
            lockAmount
            blockNumber
            blockTimestamp
            lockTotal
            hash
          }
        }
      }
    `;
    const response = await this.getQueryResponse(this.serverUrl, query);
    const delegates = response.mkrLockedDelegate.nodes;
    return delegates;
  }

  // Returns a list of the delegates the address has delegated to.
  async getMkrDelegatedTo(address) {
    const query = `
      {
        mkrDelegatedTo(argAddress: "${address}") {
          nodes {
            fromAddress
            immediateCaller
            lockAmount
            blockNumber
            blockTimestamp
            hash
          }
        }
      }
    `;
    const response = await this.getQueryResponse(this.serverUrl, query);
    const delegates = response.mkrDelegatedTo.nodes;
    return delegates;
  }
}
