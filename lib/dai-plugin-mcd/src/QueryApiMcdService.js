import { PublicService } from '@makerdao/services-core';
import fetch from 'isomorphic-fetch';
import { ServiceRoles } from './constants';
import { RAY } from './constants';
import { MDAI } from './index';
import BigNumber from 'bignumber.js';
import { stringToBytes } from './utils';

const KOVAN_SERVER_URL = 'http://vdb0-testing.vulcanize.io:5000/graphql';

export default class QueryApi extends PublicService {
  constructor(name = ServiceRoles.QUERY_API) {
    super(name, ['web3', ServiceRoles.CDP_TYPE, ServiceRoles.CDP_MANAGER]);
  }

  initialize() {
    const network = this.get('web3').network;
    switch (network) {
      case 'kovan':
      case 42:
      default:
        //always use kovan for now
        this.serverUrl = KOVAN_SERVER_URL;
        break;
    }
  }

  async _blockNumberToDateTime(blockNumber) {
    const timestamp = (await this.get('web3').getBlock(blockNumber)).timestamp;
    return new Date(1000 * timestamp);
  }

  async getCdpEventsAllIlks(urn) {
    const ilks = this.get(ServiceRoles.CDP_TYPE).cdpTypes.map(i => i.ilk);
    const events = await Promise.all(
      ilks.map(async i => {
        return this.getCdpEvents(urn, i);
      })
    );
    const arr = [].concat.apply([], events); //flatten array
    const arrSort = arr.sort((a, b) => {
      //sort by date ascending
      return a.time - b.time;
    });
    return arrSort;
  }

  //TODO, allow this function to be called from the ManagedCdp object (cdp.getCdpEvents())
  //^wait until vdb is updated with latest cdp manager's urn ids scheme
  async getCdpEvents(urn, ilk) {
    if (!ilk) {
      return this.getCdpEventsAllIlks(urn);
    }
    const ilkBytes = stringToBytes(ilk);
    const ilkBytesPadded = this.get('web3')
      ._web3.utils.padRight(ilkBytes, 64)
      .substring(2);
    const query = `query ($ilkBytesPadded: String, $urn: String){
      urnFrobs(ilk: $ilkBytesPadded, urn: $urn){
        nodes{
          ilk{nodes{rate}},
          tx{transactionHash},
          dink,
          dart,
          blockNumber,
          urn{nodes{ink, art}}
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
        variables: { ilkBytesPadded, urn }
      })
    });

    const currency = this.get(ServiceRoles.CDP_TYPE).getCdpType(null, ilk)
      .currency;

    const { data } = await resp.json();
    return Promise.all(
      data.urnFrobs.nodes.map(async e => {
        const rate = new BigNumber(e.ilk.nodes[0].rate.toString()).dividedBy(
          RAY
        );
        e.changeInCollateral = currency.wei(Math.abs(e.dink));
        if (parseInt(e.dink) !== 0) {
          e.collateralAction = parseInt(e.dink) > 0 ? 'lock' : 'free';
        }
        const dart = MDAI.wei(Math.abs(e.dart));
        e.changeInDebt = dart.times(rate);
        if (parseInt(e.dart) !== 0) {
          e.daiAction = parseInt(e.dart) > 0 ? 'draw' : 'wipe';
        }
        e.time = await this._blockNumberToDateTime(e.blockNumber);
        e.resultingCollateral = currency.wei(e.urn.nodes[0].ink);
        e.resultingDebt = MDAI.wei(e.urn.nodes[0].art);
        return e;
      })
    );
  }

  //TODO: allow this function to be called from the CdpType object (cdpType.getPriceHistory([num]))
  async getPriceHistory(ilk, num = 500) {
    const query = `query ($pipAddress: String, $num: Int){
      allPipLogValues(last: $num, condition: { contractAddress: $pipAddress }){
        nodes{
          val,
          blockNumber
        }
      }
    }`;

    const cdpType = this.get(ServiceRoles.CDP_TYPE).getCdpType(null, ilk);
    const currency = cdpType.currency;
    const pipAddress = cdpType._pipAddress;

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
    return Promise.all(
      data.allPipLogValues.nodes.map(async e => {
        e.price = currency.wei(e.val);
        e.time = await this._blockNumberToDateTime(e.blockNumber);
        return e;
      })
    );
  }
}
