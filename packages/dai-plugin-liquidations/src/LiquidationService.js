import { PublicService } from '@makerdao/services-core';
import assert from 'assert';
const MAINNET_SERVER_URL = 'api.makerdao.com';

export default class LiquidationService extends PublicService {
  constructor(name = 'liquidation') {
    super(name, ['web3']);
  }

  connect() {
    const network = this.get('web3').network;
    switch (network) {
      case 'mainnet':
      case 1:
      default:
        this.serverUrl = MAINNET_SERVER_URL;
    }
  }

  async getQueryResponse(serverUrl, query, variables) {
    const resp = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Basic YWRtaW46c2VjcmV0' //Private authentication token
      },
      body: JSON.stringify({
        query,
        variables
      })
    });
    const { data } = await resp.json();
    assert(data, `error fetching data from ${serverUrl}`);
    return data;
  }

  async getUnsafeVaults() {
    console.log('getUnsafeVaults called');
    // const query = '{' + this._buildFrobsQuery(ilkName, urn) + '}';
    // const response = await this.getQueryResponse(this.serverUrl, query);
  }
}
