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

  //change: rather than iterate through ilk types, we should just grab all cdp id's that correspond to a (proxy) address, then iterate through the cdp ids
  //question: how does the cdp portal get cdp ids for a given address? todo: look at the code

  async getCdpEventsForAddress(proxyAddress) {
    const cdpIds = this.get(ServiceRoles.CDP_MANAGER).getCdpIds(proxyAddress);
    console.log('cdpIds', cdpIds);

    const ilks = this.get(ServiceRoles.CDP_TYPE).cdpTypes.map(i => i.ilk);
    const events = await Promise.all(
      ilks.map(async i => {
        return this.getCdpEvents(i);
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
  //rather than (urn, ilk) arguments, it will just be `cdpId` argument
  //^wait until vdb is updated with latest cdp manager's urn ids scheme?
  //TODO: add error handling, and handle no return value from vulcanize?
  //allow passing in a managedCdp object? Or make sure we don't get managedCdp twice if we call it from managedCdp
  async getCdpEventsForCdpId(cdpId) {
    const managedCdp = await this.get(ServiceRoles.CDP_MANAGER).getCdp(cdpId);
    let ilk = managedCdp.ilk;
    ilk = 'ETH-B';
    console.log('ilk', ilk);
    let urn = await this.get(ServiceRoles.CDP_MANAGER).getUrn(cdpId);
    //switch out urn to something that's actually in vulcanize (and corresponds to same ilk) < - temporary measure while vulcanize still uses v0.2.2 contracts
    console.log('switching urn value from ', urn, ' to cba1bbad5fe83cf0bc96028ae3ed8bb98b56986d000000000000000000000020');
    urn = 'cba1bbad5fe83cf0bc96028ae3ed8bb98b56986d000000000000000000000020';
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

    console.log('ilkBytesPadded', ilkBytesPadded);
    console.log('urn', urn);

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
        let returnObj = {};
        returnObj.transactionHash = e.tx.transactionHash;
        const rate = new BigNumber(e.ilk.nodes[0].rate.toString()).dividedBy(
          RAY
        );
        returnObj.changeInCollateral = currency.wei(Math.abs(e.dink));
        if (parseInt(e.dink) !== 0) {
          returnObj.collateralAction = parseInt(e.dink) > 0 ? 'lock' : 'free';
        }
        const dart = MDAI.wei(Math.abs(e.dart));
        returnObj.changeInDebt = dart.times(rate);
        if (parseInt(e.dart) !== 0) {
          returnObj.daiAction = parseInt(e.dart) > 0 ? 'draw' : 'wipe';
        }
        returnObj.time = await this._blockNumberToDateTime(e.blockNumber);
        returnObj.resultingCollateral = currency.wei(e.urn.nodes[0].ink);
        returnObj.resultingDebt = MDAI.wei(e.urn.nodes[0].art);
        return returnObj;
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
        let resultObj = {};
        resultObj.price = currency.wei(e.val);
        resultObj.time = await this._blockNumberToDateTime(e.blockNumber);
        return resultObj;
      })
    );
  }
}
