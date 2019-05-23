import fetch from 'isomorphic-fetch';

const MAINNET_SERVER_URL = 'https://sai-mainnet.makerfoundation.com/v1';
const KOVAN_SERVER_URL = 'https://sai-kovan.makerfoundation.com/v1';

export async function getQueryResponse(serverUrl, query, variables) {
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

  async getCdpIdsForOwner(address) {
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
