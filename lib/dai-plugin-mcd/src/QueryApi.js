import fetch from 'isomorphic-fetch';

const KOVAN_SERVER_URL = 'http://vdb0-testing.vulcanize.io:5000/graphiql';

export default class QueryApi {
  constructor(network) {
    switch (network) {
      case 'kovan':
      case 42:
        this.serverUrl = KOVAN_SERVER_URL;
        break;
      default:
        throw new Error(`don't know what to do for network "${network}"`);
    }
  }

  //async getPriceHistory(address) {}

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
