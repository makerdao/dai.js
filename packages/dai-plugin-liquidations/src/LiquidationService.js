import { PublicService } from '@makerdao/services-core';
import assert from 'assert';
import tracksTransactions, {
  tracksTransactionsWithOptions
} from './utils/tracksTransactions';
//const MAINNET_SERVER_URL = 'https://api.makerdao.com/graphql';
const LOCAL_URL = 'http://localhost:3000/graphql';
import BigNumber from 'bignumber.js';
const RAD = new BigNumber('1e45');
const WAD = new BigNumber('1e18');
const RAY = new BigNumber('1e27');

const nullBytes =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

//hard-coded for now, but can get from pips, which you can get from ilk registry
const medianizers = {
  'LINK-A': '0xbAd4212d73561B240f10C56F27e6D9608963f17b',
  'YFI-A': '0x89AC26C0aFCB28EC55B6CD2F6b7DAD867Fa24639'
};

export default class LiquidationService extends PublicService {
  constructor(name = 'liquidation') {
    super(name, ['web3', 'smartContract']);
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
  /**
   * 
    uint256 tab,  // Debt                   [rad]
    uint256 lot,  // Collateral             [wad]
    address usr,  // Address that will receive any leftover collateral (urn owner?)
    address kpr   // Address that will receive incentives (the kicker, me)
   */

  // async kickAuction(tab, lot, usr, kpr) {
  //   return await this._clipperContract().kick(tab, lot, usr, kpr);
  // }

  /*
    uint256 id,           // Auction id
    uint256 amt,          // Upper limit on amount of collateral to buy  [wad]
    uint256 max,          // Maximum acceptable price (DAI / collateral) [ray]
    address who,          // Receiver of collateral and external call address
    bytes calldata data   // Data to pass in external call; if length 0, no call is done
  */
  @tracksTransactions
  async take(id, amount, maxPrice, address, { promise }) {
    const amt = BigNumber(amount)
      .times(WAD)
      .toFixed();
    console.log('amount', amt);

    const max = BigNumber(maxPrice)
      .times(RAY)
      .toFixed();
    console.log('max', max);

    // const amt = amount;
    // const max = maxPrice;

    return await this._clipperContract().take(
      id,
      amt,
      max,
      address,
      nullBytes,
      { promise }
    );
  }

  async kicks() {
    return await this._clipperContract().kicks();
  }

  async active(id) {
    return await this._clipperContract().active(id);
  }

  async sales(id) {
    return await this._clipperContract().sales(id);
  }

  @tracksTransactions
  async joinDaiToAdapter(address, amount, { promise }) {
    await this._joinDaiAdapter().join(address, amount, { promise });
  }

  _clipperContract() {
    return this.get('smartContract').getContractByName('MCD_CLIP_LINK_A');
  }

  _joinDaiAdapter() {
    return this.get('smartContract').getContractByName('MCD_JOIN_DAI');
  }
}
