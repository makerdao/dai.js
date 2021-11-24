import utils from 'web3-utils';

import { getQueryResponse } from './utils/getQueryResponse';
import uniq from 'lodash/uniq';
const MAINNET_SERVER_URL = 'https://sai-mainnet.makerfoundation.com/v1';

export default class QueryApi {
  constructor(network = 'mainnet') {
    switch (network) {
      case 'mainnet':
      case 1:
      default:
        this.serverUrl = MAINNET_SERVER_URL;
        break;
    }
  }

  async getCdpIdsForOwner(rawAddress) {
    const address = utils.toChecksumAddress(rawAddress);
    const query = `query ($lad: String) {
      cups1: allCups(condition: { lad: $lad }) {
        nodes {
          id
        }
      }
      cups2: allCups(condition: { guy: $lad }) {
        nodes {
          id
        }
      }
    }`;

    const { cups1, cups2 } = await getQueryResponse(this.serverUrl, query, {
      lad: address
    });
    return uniq(cups1.nodes.map(n => n.id).concat(cups2.nodes.map(n => n.id)));
  }
}
