import ethUtil from 'ethereumjs-util';
import { getQueryResponse } from '@makerdao/dai/dist/src/QueryApi';

const MAINNET_SERVER_URL = 'https://sai-mainnet.makerfoundation.com/v1';
const KOVAN_SERVER_URL = 'https://sai-kovan.makerfoundation.com/v1';

export default class QueryApi {
  constructor(network) {
    switch (network) {
      case 'mainnet':
      case 1:
        this.serverUrl = MAINNET_SERVER_URL;
        break;
      case 'kovan':
      case 42:
        this.serverUrl = KOVAN_SERVER_URL;
        break;
      default:
        throw new Error(`don't know what to do for network "${network}"`);
    }
  }

  async getCdpIdsForOwner(rawAddress) {
    const address = ethUtil.toChecksumAddress(rawAddress);
    const query = `query ($lad: String) {
      allCups(condition: { lad: $lad }) {
        nodes {
          id
        }
      }
    }`;

    const response = await getQueryResponse(this.serverUrl, query, {
      lad: address
    });
    return response.allCups.nodes.map(n => n.id);
  }
}
