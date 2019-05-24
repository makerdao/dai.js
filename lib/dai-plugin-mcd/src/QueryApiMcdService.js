import { PublicService } from '@makerdao/services-core';
import { ServiceRoles } from './constants';
import { TESTNET_ID } from '../../../contracts/networks';
import { getQueryResponse } from '../../../src/QueryApi';

const LOCAL_URL = 'http://localhost:5000/graphql';
const KOVAN_SERVER_URL = 'http://vdb0-testing.vulcanize.io:5000/graphql';

export default class QueryApi extends PublicService {
  constructor(name = ServiceRoles.QUERY_API) {
    super(name, ['web3']);
  }

  connect() {
    const network = this.get('web3').network;
    switch (network) {
      case TESTNET_ID:
        this.serverUrl = LOCAL_URL;
        break;
      case 'kovan':
      case 42:
      default:
        this.serverUrl = KOVAN_SERVER_URL;
        break;
    }
  }

  _buildFrobsQuery(ilk, urn) {
    return `
      urnFrobs(_ilkName: "${ilk}", _urn: "${urn}") {
        nodes {
          dart
          dink
          ilk {
            nodes {
              rate
            }
          }
          tx {
            transactionHash
            txFrom
            era {
              iso
            }
          }
          urn {
            nodes {
              art
              ink
            }
          }
          ilkName
        }
      }`;
  }

  async getCdpEventsForIlkAndUrn(ilkName, urn) {
    const query = '{' + this._buildFrobsQuery(ilkName, urn) + '}';
    const response = await getQueryResponse(this.serverUrl, query);
    return response.urnFrobs.nodes;
  }

  //takes in an array of objects with ilk and urn properties
  async getCdpEventsForArrayOfIlksAndUrns(cdps) {
    let query = '{';
    cdps.forEach((cdp, index) => {
      query += `frobs${index}: ` + this._buildFrobsQuery(cdp.ilk, cdp.urn);
    });
    query += '}';
    const response = await getQueryResponse(this.serverUrl, query);
    let events = [];
    cdps.forEach((_, index) => {
      events.push(response[`frobs${index}`].nodes);
    });
    const arr = [].concat.apply([], events); //flatten array
    const arrSort = arr.sort((a, b) => {
      //sort by date descending
      return new Date(b.tx.era.iso) - new Date(a.tx.era.iso);
    });
    return arrSort;
  }

  async getPriceHistoryForPip(pipAddress, num = 100) {
    const query = `query ($pipAddress: String, $num: Int){
      allPipLogValues(last: $num, condition: { contractAddress: $pipAddress }){
        nodes{
          val,
          blockNumber
        }
      }
    }`;

    const response = await getQueryResponse(this.serverUrl, query, {
      pipAddress,
      num
    });
    return response.allPipLogValues.nodes;
  }
}
