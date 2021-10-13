import { PublicService } from '@makerdao/services-core';
import {
  bytes32ToNumber,
  numberToBytes32
} from '@makerdao/dai/dist/src/utils/conversion';
import assert from 'assert';
import tracksTransactions from './utils/tracksTransactions';
const MAINNET_SERVER_URL = 'https://api.makerdao.com/graphql';
//const LOCAL_URL = 'http://localhost:3001/graphql';
import BigNumber from 'bignumber.js';

export const RAD = new BigNumber('1e45');
export const WAD = new BigNumber('1e18');
export const RAY = new BigNumber('1e27');

export const nullBytes = '0x';

export const stringToBytes = str => {
  assert(!!str, 'argument is falsy');
  assert(typeof str === 'string', 'argument is not a string');
  return '0x' + Buffer.from(str).toString('hex');
};

//hard-coded for now, but can get from pips, which you can get from ilk registry
const medianizers = {
  'LINK-A': '0xbAd4212d73561B240f10C56F27e6D9608963f17b',
  'YFI-A': '0x89AC26C0aFCB28EC55B6CD2F6b7DAD867Fa24639'
};

export default class LiquidationService extends PublicService {
  constructor(name = 'liquidation') {
    super(name, ['web3', 'smartContract']);
    this.vulcanize = true;
  }

  initialize(settings) {
    this.vulcanize = settings.vulcanize;
  }

  connect() {
    const network = this.get('web3').network;
    switch (network) {
      case 'mainnet':
      case 1:
        this.serverUrl = MAINNET_SERVER_URL;
        break;
      // case 999:
      //   this.serverUrl = LOCAL_URL;
      // break;
      default:
        this.serverUrl = MAINNET_SERVER_URL;
    }
  }

  _buildUnsafeUrnQuery(ilk) {
    return `
      getUrnsByIlk(ilkIdentifier: "${ilk}", first: 20000) {
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
    `;
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

  async getUnsafeVaults(ilks) {
    let query = '{';
    ilks.forEach(i => {
      query += i.replace('-', '');
      query += ': ';
      query += this._buildUnsafeUrnQuery(i);
    });
    query += '}';
    const response = await this.getQueryResponse(this.serverUrl, query);
    const nodes = Object.values(response);
    const urns = nodes.map(n => n.nodes).flat();
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
    const [tail, cusp, chost] = await Promise.all([
      this.getTail(ilk),
      this.getCusp(ilk),
      this.getChost(ilk)
    ]);
    if (this.vulcanize) {
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
        obj.endDate = new Date((obj.tic + tail) * 1000);
        obj.chost = chost;
        obj.cusp = cusp;
        obj.ilk = ilk;
        return obj;
      });
    } else {
      const active = await this._clipperContractByIlk(ilk).list();
      const activeAuctions = await Promise.all(
        active.map(a => {
          const id = a.toNumber();
          return this._clipperContractByIlk(ilk)
            .sales(id)
            .then(s => {
              let obj = {};
              obj.tic = new Date(new BigNumber(s.tic).times(1000).toNumber());
              obj.created = obj.tic;
              obj.tab = new BigNumber(s.tab).div(RAD);
              obj.lot = new BigNumber(s.lot).div(WAD);
              obj.top = new BigNumber(s.top).div(RAY);
              obj.usr = s.usr;
              obj.saleId = id;
              obj.active = true;
              obj.endDate = new Date(
                new BigNumber(s.tic.toNumber() + tail).times(1000).toNumber()
              );
              obj.chost = chost;
              obj.cusp = cusp;
              obj.ilk = ilk;
              return obj;
            });
        })
      );
      return activeAuctions;
    }
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
  async take(ilk, auctionId, amount, maxPrice, address, { promise }) {
    const id = numberToBytes32(auctionId);

    const amt = BigNumber(amount)
      .times(WAD)
      .toFixed();

    const max = BigNumber(maxPrice)
      .times(RAY)
      .toFixed();

    return await this._clipperContractByIlk(ilk).take(
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
  async kicks(ilk) {
    return await this._clipperContractByIlk(ilk).kicks();
  }

  // Returns the ID of the auction at the index
  async active(ilk, index) {
    return await this._clipperContractByIlk(ilk).active(index);
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
  async sales(ilk, id) {
    return await this._clipperContractByIlk(ilk).sales(id);
  }

  // Returns the total number of active auctions
  async count(ilk) {
    return await this._clipperContractByIlk(ilk).count();
  }

  async list(ilk) {
    return await this._clipperContractByIlk(ilk).list();
  }

  // Returns boolean for if an auction needs a redo and also the current price
  async getStatus(ilk, auctionId) {
    const id = numberToBytes32(auctionId);
    const status = await this._clipperContractByIlk(ilk).getStatus(id);
    return status;
  }

  async getHoleAndDirtForIlk(ilk) {
    const data = await this._dogContract().ilks(stringToBytes(ilk));
    const hole = new BigNumber(data.hole).div(RAD);
    const dirt = new BigNumber(data.dirt).div(RAD);
    const diff = hole.minus(dirt);
    return { hole, dirt, diff };
  }

  async getHoleAndDirt() {
    const [h, d] = await Promise.all([
      this._dogContract().Hole(),
      this._dogContract().Dirt()
    ]);
    const hole = new BigNumber(h).div(RAD);
    const dirt = new BigNumber(d).div(RAD);
    const diff = hole.minus(dirt);
    return { hole, dirt, diff };
  }

  async getChost(ilk) {
    const chost = await this._clipperContractByIlk(ilk).chost();
    return new BigNumber(chost).div(RAD);
  }

  async getTail(ilk) {
    const tail = await this._clipperContractByIlk(ilk).tail();
    return tail.toNumber();
  }

  async getCusp(ilk) {
    const cusp = await this._clipperContractByIlk(ilk).cusp();
    return new BigNumber(cusp).div(RAY);
  }

  // @tracksTransactions
  // async yank(id, { promise }) {
  //   return await this._clipperContract().yank(id, { promise });
  // }

  @tracksTransactions
  async redo(ilk, auctionId, address, { promise }) {
    const id = numberToBytes32(auctionId);
    return await this._clipperContractByIlk(ilk).redo(id, address, { promise });
  }

  @tracksTransactions
  async joinDaiToAdapter(amount, { promise }) {
    const address = this.get('web3').currentAddress();
    const amt = BigNumber(amount)
      .times(WAD)
      .toFixed();
    return await this._joinDaiAdapter().join(address, amt, { promise });
  }

  @tracksTransactions
  async exitDaiFromAdapter(amount, { promise }) {
    const address = this.get('web3').currentAddress();
    const amt = BigNumber(amount)
      .times(WAD)
      .toFixed();
    return await this._joinDaiAdapter().exit(address, amt, { promise });
  }

  @tracksTransactions
  async exitGemFromAdapter(ilk, amount, { promise }) {
    const address = this.get('web3').currentAddress();
    const amt = BigNumber(amount)
      .times(WAD)
      .toFixed();
    return await this._joinGemAdapter(ilk).exit(address, amt, { promise });
  }

  @tracksTransactions
  async bark(ilk, urn, { promise }) {
    try {
      const address = this.get('web3').currentAddress();
      const tx = await this._dogContract().bark(
        stringToBytes(ilk),
        urn,
        address,
        {
          promise
        }
      );

      const id = tx.receipt.logs[4].topics[3];
      return bytes32ToNumber(id);
    } catch (e) {
      throw console.error(e);
    }
  }

  _clipperContractByIlk(ilk) {
    const suffix = ilk.replace('-', '_');
    return this.get('smartContract').getContractByName(`MCD_CLIP_${suffix}`);
  }

  _dogContract() {
    return this.get('smartContract').getContractByName('MCD_DOG');
  }

  _joinDaiAdapter() {
    return this.get('smartContract').getContractByName('MCD_JOIN_DAI');
  }

  _joinGemAdapter(ilk) {
    const suffix = ilk.replace('-', '_');
    return this.get('smartContract').getContractByName(`MCD_JOIN_${suffix}`);
  }
}
