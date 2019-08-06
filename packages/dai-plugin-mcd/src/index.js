import assert from 'assert';
import mapValues from 'lodash/mapValues';
import reduce from 'lodash/reduce';
import uniqBy from 'lodash/uniqBy';
import { createCurrency, createCurrencyRatio } from '@makerdao/currency';
import testnetAddresses from '../contracts/addresses/testnet.json';
import kovanAddresses from '../contracts/addresses/kovan.json';
import abiMap from '../contracts/abiMap.json';
import CdpManager from './CdpManager';
import SavingsService from './SavingsService';
import CdpTypeService from './CdpTypeService';
import AuctionService from './AuctionService';
import SystemDataService from './SystemDataService';
import QueryApiMcdService from './QueryApiMcdService';
import { ServiceRoles as ServiceRoles_ } from './constants';
import BigNumber from 'bignumber.js';

export const ServiceRoles = ServiceRoles_;
const {
  CDP_MANAGER,
  CDP_TYPE,
  SYSTEM_DATA,
  AUCTION,
  QUERY_API,
  SAVINGS
} = ServiceRoles;

// look up contract ABIs using abiMap.
// if an exact match is not found, prefix-match against keys ending in *, e.g.
// MCD_JOIN_ETH_B matches MCD_JOIN_*
// this implementation assumes that all contracts in kovan.json are also in testnet.json
let addContracts = reduce(
  testnetAddresses,
  (result, testnetAddress, name) => {
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
        address: {
          testnet: testnetAddress,
          kovan: kovanAddresses[name]
        }
      };
    }
    return result;
  },
  {}
);

export const ETH = createCurrency('ETH');
export const MKR = createCurrency('MKR');
export const USD = createCurrency('USD');
export const USD_ETH = createCurrencyRatio(USD, ETH);

// these are prefixed with M so that they don't override their SCD versions--
// otherwise, adding the MCD plugin would break MCD. maybe there's a better way
// to work around this?
export const MWETH = createCurrency('MWETH');
export const MDAI = createCurrency('MDAI');

export const REP = createCurrency('REP');
export const ZRX = createCurrency('ZRX');
export const OMG = createCurrency('OMG');
export const BAT = createCurrency('BAT');
export const DGD = createCurrency('DGD');
export const GNT = createCurrency('GNT');

const defaultCdpTypes = [
  { currency: ETH, ilk: 'ETH-A' },
  { currency: ETH, ilk: 'ETH-B' },
  { currency: REP, ilk: 'REP-A' },
  // { currency: REP, ilk: 'REP-B' },
  { currency: ZRX, ilk: 'ZRX-A' },
  { currency: OMG, ilk: 'OMG-A' },
  { currency: BAT, ilk: 'BAT-A' },
  { currency: DGD, ilk: 'DGD-A', decimals: 9 },
  { currency: GNT, ilk: 'GNT-A' },

  // the CDP type below is not present in the testchain snapshot -- its purpose
  // is to verify that the code does not throw an error if a CDP type is
  // included that we don't have addresses for, so long as we never attempt to
  // use it. This flexibility allows us to hardcode extra types for local
  // testing even though they won't be present on Kovan or mainnet.
  { currency: ETH, ilk: 'ETH-C' }
];

export default {
  addConfig: (
    _,
    {
      cdpTypes = defaultCdpTypes,
      network = 'testnet',
      addressOverrides,
      prefetch = true
    } = {}
  ) => {
    if (addressOverrides) {
      addContracts = mapValues(addContracts, (contractDetails, name) => ({
        ...contractDetails,
        address: {
          [network]: addressOverrides[name] || contractDetails.address[network]
        }
      }));
    }
    const tokens = uniqBy(cdpTypes, 'currency').map(
      ({ currency, address, abi, decimals }) => {
        const data =
          address && abi ? { address, abi } : addContracts[currency.symbol];
        assert(data, `No address and ABI found for "${currency.symbol}"`);
        return {
          currency,
          abi: data.abi,
          address: data.address[network] || data.address,
          decimals: data.decimals || decimals
        };
      }
    );

    // remove contracts that don't have an address for the given network
    for (let c of Object.keys(addContracts)) {
      if (
        typeof addContracts[c].address === 'object' &&
        !addContracts[c].address[network]
      ) {
        delete addContracts[c];
      }
    }

    console.log(tokens[0]);
    // Set global BigNumber precision to enable exponential operations
    BigNumber.config({ POW_PRECISION: 100 });

    return {
      smartContract: { addContracts },
      token: {
        erc20: [
          { currency: MDAI, address: addContracts.MCD_DAI.address[network] },
          { currency: MWETH, address: addContracts.ETH.address[network] },
          ...tokens
        ]
      },
      additionalServices: [
        CDP_MANAGER,
        CDP_TYPE,
        AUCTION,
        SYSTEM_DATA,
        QUERY_API,
        SAVINGS
      ],
      [CDP_TYPE]: [CdpTypeService, { cdpTypes, prefetch }],
      [CDP_MANAGER]: CdpManager,
      [SAVINGS]: SavingsService,
      [AUCTION]: AuctionService,
      [SYSTEM_DATA]: SystemDataService,
      [QUERY_API]: QueryApiMcdService
    };
  }
};
