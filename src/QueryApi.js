import fetch from 'node-fetch';

const MAINNET_SERVER_URL = 'https://sai-mainnet.makerfoundation.com/v1';
const KOVAN_SERVER_URL = 'https://sai-kovan.makerfoundation.com/v1';

export default class QueryApi {
  constructor(network) {
    switch (network) {
      case 'mainnet':
        this.serverUrl = MAINNET_SERVER_URL;
        break;
      case 'kovan':
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

    const resp = await fetch(this.serverUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables: { lad: address } })
    });

    const { data } = await resp.json();
    return data.allCups.nodes.map(n => n.id);
  }
}
