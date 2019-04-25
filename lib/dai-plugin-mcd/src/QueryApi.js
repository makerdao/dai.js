import fetch from 'isomorphic-fetch';

const KOVAN_SERVER_URL = 'http://vdb0-testing.vulcanize.io:5000/graphql';

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


  async getCdpEventsForIlkAndUrn(ilk, urn){
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
    }`

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
    return data.urnFrobs.nodes;
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
