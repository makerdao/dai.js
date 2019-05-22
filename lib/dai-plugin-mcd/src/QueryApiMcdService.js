import { PublicService } from '@makerdao/services-core';
import fetch from 'isomorphic-fetch';
import { ServiceRoles } from './constants';
import { stringToBytes } from './utils';
import { TESTNET_ID } from '../../../contracts/networks';

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

  async _blockNumberToDateTime(blockNumber) {
    const timestamp = (await this.get('web3').getBlock(blockNumber)).timestamp;
    return new Date(1000 * timestamp);
  }

  async _getQueryResponse(serverUrl, query, variables){
    const resp = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    const { data } = await resp.json();
    return data;
  }

  //TODO: add error handling, and handle no return value from vulcanize?
  async getCdpEventsForIlkAndUrn(ilk, urn, ilkNameReplacement = null) {
    let ilkName = stringToBytes(ilk);
    if (ilkNameReplacement) ilkName = ilkNameReplacement; //only used for testing when the ilks in vdb don't match the ilks in the sdk
    //todo: confirm whether it really is the case that the ilks don't match?
    const query = `query ($ilkName: String!, $urn: String!){
      urnFrobs(_ilkName: $ilkName, _urn: $urn) {
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
        }
      }
    }`;
    const response = await this._getQueryResponse(this.serverUrl, query, { ilkName, urn });
    return response.urnFrobs.nodes;
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

    const response = await this._getQueryResponse(this.serverUrl, query, { pipAddress, num });
    return response.allPipLogValues.nodes;
  }
}
