import { mapValues, isEmpty, reduce } from 'lodash';
import { createCurrency } from '@makerdao/currency';
import addresses from '../contracts/addresses/testnet.json';
import abiMap from '../contracts/abiMap.json';
import CdpManager from './CdpManager';
import CdpTypeService from './CdpTypeService';
import AuctionService from './AuctionService';
import SystemDataService from './SystemDataService';
import { ServiceRoles } from './constants';
const { CDP_MANAGER, CDP_TYPE, SYSTEM_DATA, AUCTION } = ServiceRoles;

// look up contract ABIs using abiMap.
// if an exact match is not found, prefix-match against keys ending in *, e.g.
// MCD_JOIN_ETH_B matches MCD_JOIN_*
let mcdContracts = reduce(
  addresses,
  (result, address, name) => {
    let abiName = abiMap[name];
    if (!abiName) {
      const prefix = Object.keys(abiMap).find(
        k =>
          k.substring(k.length - 1) == '*' &&
          k.substring(0, k.length - 1) == name.substring(0, k.length - 1)
      );
      if (prefix) abiName = abiMap[prefix];
    }
    if (abiName) {
      result[name] = {
        abi: require(`../contracts/abis/${abiName}.json`),
        address
      };
    }
    return result;
  },
  {}
);

export const ETH = createCurrency('ETH');
export const WETH = createCurrency('WETH');
export const MDAI = createCurrency('MDAI');
export const MKR = createCurrency('MKR');
export const USD = createCurrency('USD');

export default {
  addConfig: (_, { cdpTypes, addressOverrides = {} } = {}) => {
    if (!isEmpty(addressOverrides))
      mcdContracts = mapValues(mcdContracts, (contractDetails, name) => ({
        ...contractDetails,
        address: addressOverrides[name] || contractDetails.address
      }));

    return {
      smartContract: {
        addContracts: mcdContracts
      },
      token: {
        erc20: [
          { currency: MDAI, ...mcdContracts.MCD_DAI }
        ]
      },
      additionalServices: [CDP_MANAGER, CDP_TYPE, AUCTION, SYSTEM_DATA],
      [CDP_TYPE]: [CdpTypeService, { cdpTypes }],
      [CDP_MANAGER]: CdpManager,
      [AUCTION]: AuctionService,
      [SYSTEM_DATA]: SystemDataService
    };
  }
};
