import { PublicService } from '@makerdao/services-core';
import assert from 'assert';
//const MAINNET_SERVER_URL = 'https://api.makerdao.com/graphql';
const LOCAL_URL = 'http://localhost:3000/graphql';
import BigNumber from 'bignumber.js';
const RAD = new BigNumber('1e45');
const WAD = new BigNumber('1e18');
const RAY = new BigNumber('1e27');

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
        //this.serverUrl = MAINNET_SERVER_URL;
        this.serverUrl = LOCAL_URL; //TODO: switch once done using the mocked vdb api
    }
  }

  _buildUnsafeUrnQuery(ilk) {
    return `
      {getUrnsByIlk(ilkIdentifier: "${ilk}", first: 20000) {
        nodes {
          urnIdentifier
          art
          ink
          ilk{
            rate
            spot
          }
        }
      }
    }`;
  }

  _buildAllClipsQuery(ilk) {
    return `
    {allClips(ilk: "${ilk}") {
      edges {
        node {
          saleId
          pos
          tab
          lot
          usr
          tic
          top
          active
          created
          updated
        }
      }
    }}`;
  }

  async getQueryResponse(serverUrl, query, variables) {
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
    assert(data, `error fetching data from ${serverUrl}`);
    return data;
  }

  async getUnsafeVaults(ilk) {
    const response = await this.getQueryResponse(
      this.serverUrl,
      this._buildUnsafeUrnQuery(ilk)
    );
    const urns = response.getUrnsByIlk.nodes;
    return urns.filter(u => {
      const art = BigNumber(u.art);
      const ink = BigNumber(u.ink);
      const rate = BigNumber(u.ilk.rate);
      const spot = BigNumber(u.ilk.spot);
      if (art.eq(0) || rate.eq(0)) return false;
      return art.div(ink).gt(spot.div(rate));
    });
  }

  async getAllClips(ilk) {
    const response = await this.getQueryResponse(
      this.serverUrl,
      this._buildAllClipsQuery(ilk)
    );
    const clips = response.allClips;
    return clips.edges.map(c => {
      let obj = c.node;
      obj.tic = new Date(obj.tic * 1000);
      obj.tab = BigNumber(obj.tab).div(RAD);
      obj.lot = BigNumber(obj.lot).div(WAD);
      obj.top = BigNumber(obj.top).div(RAY);
      obj.created = new Date(obj.created);
      obj.updated = new Date(obj.updated);
      return obj;
    });
  }
}
