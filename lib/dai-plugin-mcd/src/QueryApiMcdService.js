import { PublicService } from '@makerdao/services-core';
import fetch from 'isomorphic-fetch';
import { ServiceRoles } from './constants';
import { RAY } from './constants';
import { MDAI } from './index';
import BigNumber from 'bignumber.js';
import { stringToBytes } from './utils';
import { TESTNET_ID } from '../../../contracts/networks';

const LOCAL_URL = 'http://localhost:5000/graphql';
const KOVAN_SERVER_URL = 'http://vdb0-testing.vulcanize.io:5000/graphql';

export default class QueryApi extends PublicService {
  constructor(name = ServiceRoles.QUERY_API) {
    super(name, ['web3', ServiceRoles.CDP_TYPE]);
  }

  initialize() {
    const network = this.get('web3').network;
    switch (network) {
      case TESTNET_ID:
        this.serverUrl = LOCAL_URL;
        break;
      case 'kovan':
      case 42:
      default:
        this.serverUrl = KOVAN_SERVER_URL;
        break;
    }
  }

  async _blockNumberToDateTime(blockNumber) {
    const timestamp = (await this.get('web3').getBlock(blockNumber)).timestamp;
    return new Date(1000 * timestamp);
  }

  //change: rather than iterate through ilk types, we should just grab all cdp id's that correspond to a (proxy) address, then iterate through the cdp ids

  //WIP
  // async getCdpEventsForAddress(proxyAddress) {
  //   const cdpIds = this.get(ServiceRoles.CDP_MANAGER).getCdpIds(proxyAddress);
  //   console.log('cdpIds', cdpIds);

  //   const ilks = this.get(ServiceRoles.CDP_TYPE).cdpTypes.map(i => i.ilk);
  //   const events = await Promise.all(
  //     ilks.map(async i => {
  //       return this.getCdpEvents(i);
  //     })
  //   );
  //   const arr = [].concat.apply([], events); //flatten array
  //   const arrSort = arr.sort((a, b) => {
  //     //sort by date ascending
  //     return a.time - b.time;
  //   });
  //   return arrSort;
  // }

  //TODO, allow this function to be called from the ManagedCdp object (cdp.getCdpEvents())
  //TODO: add error handling, and handle no return value from vulcanize?
  //allow passing in a managedCdp object? Or make sure we don't get managedCdp twice if we call it from managedCdp
  //todo: break function into two functions? one that takes in cdpId, and one that just takes in ilk and urn arguments? and then can test the two separately?
  //And then the logic of getting ilk and urn from managedCdp could even be in this managedCdp function?? that way you don't have to call getCdp() unnecessarily
  // async getCdpEventsForCdpId(cdpId) {
  //   const managedCdp = await this.get(ServiceRoles.CDP_MANAGER).getCdp(cdpId);
  //   const ilk = managedCdp.ilk;
  //   let urn = await managedCdp.getUrn(cdpId);
  //   return this.getCdpEventsForIlkAndUrn(ilk, urn);
  // }

  async getCdpEventsForIlkAndUrn(ilk, urn, ilkNameReplacement = null) {
    let ilkName = stringToBytes(ilk);
    if (ilkNameReplacement) ilkName = ilkNameReplacement; //only used for testing when the ilks in vdb don't match the ilks in the sdk
    //todo: confirm whether it really is the case that the ilks don't match?
    const query = `query ($ilkName: String, $urn: String){
      urnFrobs(ilkName: $ilkName, urn: $urn) {
        nodes {
          dart
          dink
          ilk {
            nodes {
              rate
            }
          }
          tx {
            transactionHash
            blockHeight
            txFrom
          }
          urn {
            nodes {
              art
              ink
            }
          }
        }
      }
    }`;
    console.log('ilkName, urn', ilkName, urn);
    const resp = await fetch(this.serverUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        variables: { ilkName, urn }
      })
    });
    const currency = this.get(ServiceRoles.CDP_TYPE).getCdpType(null, ilk)
      .currency;

    const { data } = await resp.json();
    return Promise.all(
      data.urnFrobs.nodes.map(async e => {
        let returnObj = {};
        //returnObj.transactionHash = e.tx.transactionHash; //local vdb doesn't support tx data yet
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
        //returnObj.time = await this._blockNumberToDateTime(e.tx.blockHeight); //local vdb doesn't support tx data yet
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
