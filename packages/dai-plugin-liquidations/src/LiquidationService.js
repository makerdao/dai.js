import { PublicService } from '@makerdao/services-core';
import { numberToBytes32 } from '@makerdao/dai/dist/src/utils/conversion';
import assert from 'assert';
import tracksTransactions from './utils/tracksTransactions';
//const MAINNET_SERVER_URL = 'https://api.makerdao.com/graphql';
// const LOCAL_URL = 'http://localhost:3001/graphql';
const LOCAL_URL = 'https://dd0965745ea7.ngrok.io/graphql'; // temporary ngrok
import BigNumber from 'bignumber.js';
const RAD = new BigNumber('1e45');
const WAD = new BigNumber('1e18');
const RAY = new BigNumber('1e27');

export const nullBytes = '0x';

//hard-coded for now, but can get from pips, which you can get from ilk registry
const medianizers = {
  'LINK-A': '0xbAd4212d73561B240f10C56F27e6D9608963f17b',
  'YFI-A': '0x89AC26C0aFCB28EC55B6CD2F6b7DAD867Fa24639'
};

export default class LiquidationService extends PublicService {
  constructor(name = 'liquidation') {
    super(name, ['web3', 'smartContract']);
    // console.log('link works!');
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

  _allDustQuery() {
    return `
    {allIlks(first: 1000) {
      nodes {
        id
        dust
      }
    }}`;
  }

  _buildMedianizerQuery(ilk) {
    const address = medianizers[ilk];
    return `
    {allLogMedianPrices(last: 1, filter: {addressByAddressId: {address: {equalTo: "${address}"}}}) {
      nodes {
        val
        addressByAddressId {
          address
        }
      }
    }
  }`;
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

  async getAllDusts() {
    const response = await this.getQueryResponse(
      this.serverUrl,
      this._allDustQuery()
    );
    return response.allIlks.nodes.map(i => {
      i.ilk = i.id;
      i.dust = BigNumber(i.dust).div(RAD);
      return i;
    });
  }

  async getPrice(ilk) {
    if (!medianizers[ilk]) return null;
    const response = await this.getQueryResponse(
      this.serverUrl,
      this._buildMedianizerQuery(ilk)
    );
    return BigNumber(response.allLogMedianPrices.nodes[0].val).div(WAD);
  }

  /* TAKE
    uint256 id,           // Auction id
    uint256 amt,          // Upper limit on amount of collateral to buy  [wad]
    uint256 max,          // Maximum acceptable price (DAI / collateral) [ray]
    address who,          // Receiver of collateral and external call address
    bytes calldata data   // Data to pass in external call; if length 0, no call is done
  */
  @tracksTransactions
  async take(auctionId, amount, maxPrice, address, { promise }) {
    const id = numberToBytes32(auctionId);

    const amt = BigNumber(amount)
      .times(WAD)
      .toFixed();

    const max = BigNumber(maxPrice)
      .times(RAY)
      .toFixed();

    return await this._clipperContract().take(
      id,
      amt,
      max,
      address,
      nullBytes,
      {
        promise
      }
    );
  }

  // Returns the total number of kicks, active or inactive
  async kicks() {
    return await this._clipperContract().kicks();
  }

  // Returns the ID of the auction at the index
  async active(index) {
    return await this._clipperContract().active(index);
  }

  /* struct Sale {
        uint256 pos;  // Index in active array
        uint256 tab;  // Dai to raise       [rad]
        uint256 lot;  // collateral to sell [wad]
        address usr;  // Liquidated CDP
        uint96  tic;  // Auction start time
        uint256 top;  // Starting price     [ray]
    }
  */
  async sales(id) {
    return await this._clipperContract().sales(id);
  }

  // Returns the total number of active auctions
  async count() {
    return await this._clipperContract().count();
  }

  async list() {
    return await this._clipperContract().list();
  }

  async getStatus(id) {
    return await this._clipperContract().getStatus(id);
  }

  // async upchost() {
  //   return await this._clipperContract().upchost();
  // }

  @tracksTransactions
  async yank(id, { promise }) {
    return await this._clipperContract().yank(id, { promise });
  }

  @tracksTransactions
  async joinDaiToAdapter(address, amount, { promise }) {
    return await this._joinDaiAdapter().join(address, amount, { promise });
  }

  _clipperContract() {
    return this.get('smartContract').getContractByName('MCD_CLIP_LINK_A');
  }

  _joinDaiAdapter() {
    return this.get('smartContract').getContractByName('MCD_JOIN_DAI');
  }
}
