import {
  USER_VAULT_IDS,
  USER_VAULT_ADDRESSES,
  USER_VAULT_TYPES
} from './_constants';
import { validateAddress } from './_validators';
import { bytesToString } from '../utils';

export const getCdps = {
  generate: (vaultManagerAddress, proxyAddress, descending = true) => ({
    id: `GET_CDPS.getCdps${descending ? 'Desc' : 'Asc'}(${proxyAddress})`,
    contract: 'GET_CDPS',
    call: [
      `getCdps${
        descending ? 'Desc' : 'Asc'
      }(address,address)(uint256[],address[],bytes32[])`,
      vaultManagerAddress,
      proxyAddress
    ]
  }),
  validate: {
    args: (_, address) =>
      validateAddress`Invalid address for getCdps: ${'address'}`(address)
  },
  returns: [
    [USER_VAULT_IDS, v => v.map(n => n.toNumber())],
    [USER_VAULT_ADDRESSES],
    [USER_VAULT_TYPES, v => v.map(bytesToString)]
  ]
};

export default {
  getCdps
};
