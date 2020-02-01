import { PublicService } from '@makerdao/services-core';
import assert from 'assert';
import { netIdtoSpockUrl, netIdtoSpockUrlStaging } from './utils/helpers';

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
    if (!response.totalMkrWeightProxyAndNoProxyByAddress.nodes[0]) return 0;
    return response.totalMkrWeightProxyAndNoProxyByAddress.nodes[0].weight;
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

  async getBlockNumber(unixTime) {
    const query = `{
      timeToBlockNumber(argUnix: ${unixTime}){
      nodes
    }
    }`;
    const response = await this.getQueryResponseMemoized(this.serverUrl, query);
    return response.timeToBlockNumber.nodes[0];
  }

  async getMkrSupport(pollId, unixTime) {
    const query = `{voteOptionMkrWeightsAtTime(argPollId: ${pollId}, argBlockNumber: ${unixTime}){
    nodes{
      optionId
      mkrSupport
    }
  }
  }`;
    const response = await this.getQueryResponseMemoized(this.serverUrl, query);
    let weights = response.voteOptionMkrWeights.nodes;
    // We don't want to calculate votes for 0:abstain
    weights = weights.filter(o => o.optionId !== 0);
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
      o.blockTimestamp = new Date(o.blockTimestamp);
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
}
