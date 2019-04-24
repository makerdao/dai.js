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

  //question: how far back do we want to go here? Todo: look at design
  async getPriceHistoryForPip(pipAddress, num = 50000) {
    const query = `query ($pipAddr: String){
      allPipLogValues(last: $num, condition: { contractAddress: $pipAddr }){
        nodes{
          val,
          blockNumber
        }
      }
      }
    }`;

    const resp = await fetch(this.serverUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables: { pipAddr: pipAddress, num: num } })
    });

    const { data } = await resp.json();
    return data.allCups.nodes.map(n => n.id);
  }
}
