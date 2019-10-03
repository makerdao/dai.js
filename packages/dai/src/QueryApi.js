import fetch from 'isomorphic-fetch';
import assert from 'assert';

const MAINNET_SERVER_URL = 'https://sai-mainnet.makerfoundation.com/v1';
const KOVAN_SERVER_URL = 'https://sai-kovan.makerfoundation.com/v1';

export async function getQueryResponse(serverUrl, query, variables) {
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

// sample code from EIP-55 "Mixed-case checksum address encoding":
// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-55.md
function toChecksumAddress(address) {
  address = address.toLowerCase().replace('0x', '');
  const createKeccakHash = require('keccak');
  var hash = createKeccakHash('keccak256')
    .update(address)
    .digest('hex');
  var ret = '0x';

  for (var i = 0; i < address.length; i++) {
    if (parseInt(hash[i], 16) >= 8) {
      ret += address[i].toUpperCase();
    } else {
      ret += address[i];
    }
  }

  return ret;
}

export default class QueryApi {
  constructor(network) {
    switch (network) {
      case 'mainnet':
      case 1:
        this.serverUrl = MAINNET_SERVER_URL;
        break;
      case 'kovan':
      case 42:
        this.serverUrl = KOVAN_SERVER_URL;
        break;
      default:
        throw new Error(`don't know what to do for network "${network}"`);
    }
  }

  async getCdpIdsForOwner(rawAddress) {
    const address = toChecksumAddress(rawAddress);
    const query = `query ($lad: String) {
      allCups(condition: { lad: $lad }) {
        nodes {
          id
        }
      }
    }`;

    const response = await getQueryResponse(this.serverUrl, query, {
      lad: address
    });
    return response.allCups.nodes.map(n => n.id);
  }
}
