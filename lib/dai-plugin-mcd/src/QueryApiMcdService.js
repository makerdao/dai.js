import { PublicService } from '@makerdao/services-core';
import fetch from 'isomorphic-fetch';
import { ServiceRoles } from './constants';
import { RAY } from './constants';
import { MDAI } from './index';
import BigNumber from 'bignumber.js';
import { stringToBytes } from './utils';

const KOVAN_SERVER_URL = 'http://vdb0-testing.vulcanize.io:5000/graphql';

export default class QueryApi extends PublicService {
  constructor(name = ServiceRoles.QUERY_API) {
    super(name, ['web3', ServiceRoles.CDP_TYPE]);
  }

  initialize() {
    const network = this.get('web3').network;
    switch (network) {
      case 'kovan':
      case 42:
      default: //always use kovan for now
        this.serverUrl = KOVAN_SERVER_URL;
        break;
    }
  }

  async getCdpEventsForIlkAndUrn(ilk, urn) {
    const ilkBytes = stringToBytes(ilk);
    const ilkBytesPadded = this.get('web3')._web3.utils.padRight(ilkBytes, 64).substring(2);
    const query = `query ($ilkBytesPadded: String, $urn: String){
      urnFrobs(ilk: $ilkBytesPadded, urn: $urn){
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
        variables: { ilkBytesPadded, urn }
      })
    });

    const currency = this.get(ServiceRoles.CDP_TYPE).getCdpType(null, ilk).currency;

    const { data } = await resp.json();
    return Promise.all(
      data.urnFrobs.nodes.map(async e => {
        const rate = new BigNumber(e.ilk.nodes[0].rate.toString()).dividedBy(
          RAY
        );
        e.collateralAmount = currency.wei(e.dink);
        if (!e.collateralAmount.isEqual(0)) {
          e.collateralAction = e.collateralAmount.gt(0) ? 'lock' : 'free';
        }
        const dart = MDAI.wei(e.dart);
        e.daiAmount = dart.times(rate);
        if (!e.daiAmount.isEqual(0)) {
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
