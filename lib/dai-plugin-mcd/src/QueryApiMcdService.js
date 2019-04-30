import { PublicService } from '@makerdao/services-core';
import fetch from 'isomorphic-fetch';
import { ServiceRoles } from './constants';
import { RAY } from './constants';
import { MDAI } from './index';
import BigNumber from 'bignumber.js';

const KOVAN_SERVER_URL = 'http://vdb0-testing.vulcanize.io:5000/graphql';

export default class QueryApi extends PublicService {
  constructor(name = ServiceRoles.QUERY_API) {
    super(name, ['web3']);
  }

  initialize(network) {
    switch (network) {
      case 'kovan':
      case 42:
      default:
        //always use kovan for now
        this.serverUrl = KOVAN_SERVER_URL;
        break;
    }
  }

  async getCdpEventsForIlkAndUrn(ilk, urn) {
    const query = `query ($ilk: String, $urn: String){
      urnFrobs(ilk: $ilk, urn: $urn){
        nodes{
          ilk{nodes{rate}},
          tx{transactionHash},
          dink,
          dart,
          blockNumber,
          urn{nodes{ink, art}}
        }
      }
    }`;

    const resp = await fetch(this.serverUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        variables: { ilk, urn }
      })
    });
    const { data } = await resp.json();
    return Promise.all(
      data.urnFrobs.nodes.map(async e => {
        //todo: convert to currency unit, which will be passed in instead of ilk? But then how do we differentiate between two ilks with the same collateral?
        const rate = new BigNumber(e.ilk.nodes[0].rate.toString()).dividedBy(RAY);
        const dart = MDAI.wei(e.dart);
        e.daiAmount = dart.times(rate);
        if(!e.daiAmount.isEqual(0)){
          e.daiAction = e.daiAmount.gt(0) ? 'draw' : 'wipe';
        }
        const timestamp = (await this.get('web3').getBlock(e.blockNumber))
          .timestamp;
        e.time = new Date(1000 * timestamp);
        return e;
      })
    );
  }

  async getPriceHistoryForPip(pipAddress, num = 500000) {
    const query = `query ($pipAddress: String, $num: Int){
      allPipLogValues(last: $num, condition: { contractAddress: $pipAddress }){
        nodes{
          val,
          blockNumber
        }
      }
    }`;

    const resp = await fetch(this.serverUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        variables: { pipAddress, num }
      })
    });
    const { data } = await resp.json();
    return data.allPipLogValues.nodes;
  }
}
