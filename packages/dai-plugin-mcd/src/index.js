import assert from 'assert';
import mapValues from 'lodash/mapValues';
import reduce from 'lodash/reduce';
import uniqBy from 'lodash/uniqBy';
import { createCurrency, createCurrencyRatio } from '@makerdao/currency';
import testnetAddresses from '../contracts/addresses/testnet.json';
import kovanAddresses from '../contracts/addresses/kovan.json';
import mainnetAddresses from '../contracts/addresses/mainnet.json';
import abiMap from '../contracts/abiMap.json';
import CdpManager from './CdpManager';
import SavingsService from './SavingsService';
import CdpTypeService from './CdpTypeService';
import AuctionService from './AuctionService';
import SystemDataService from './SystemDataService';
import { ServiceRoles as ServiceRoles_ } from './constants';
import BigNumber from 'bignumber.js';

export const ServiceRoles = ServiceRoles_;
const { CDP_MANAGER, CDP_TYPE, SYSTEM_DATA, AUCTION, SAVINGS } = ServiceRoles;

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
          kovan: kovanAddresses[name],
          mainnet: mainnetAddresses[name]
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

// Casting for savings dai
export const DSR_DAI = createCurrency('DSR-DAI');

export const REP = createCurrency('REP');
export const ZRX = createCurrency('ZRX');
export const OMG = createCurrency('OMG');
export const BAT = createCurrency('BAT');
export const DGD = createCurrency('DGD');
export const GNT = createCurrency('GNT');
export const USDC = createCurrency('USDC');

export const defaultCdpTypes = [
  { currency: ETH, ilk: 'ETH-A' },
  { currency: BAT, ilk: 'BAT-A' },
  { currency: USDC, ilk: 'USDC-A', decimals: 6 }
];

export const SAI = createCurrency('SAI');

export const ALLOWANCE_AMOUNT = BigNumber(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
);

export const defaultTokens = [
  ...new Set([
    ...defaultCdpTypes.map(type => type.currency),
    MDAI,
    MWETH,
    SAI,
    DSR_DAI
  ])
];

export const McdPlugin = {
  addConfig: (
    _,
    { cdpTypes = defaultCdpTypes, addressOverrides, prefetch = true } = {}
  ) => {
    if (addressOverrides) {
      addContracts = mapValues(addContracts, (contractDetails, name) => ({
        ...contractDetails,
        address: addressOverrides[name] || contractDetails.address
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
          address: data.address,
          decimals: data.decimals || decimals
        };
      }
    );

    // Set global BigNumber precision to enable exponential operations
    BigNumber.config({ POW_PRECISION: 100 });

    return {
      smartContract: { addContracts },
      token: {
        erc20: [
          { currency: MDAI, address: addContracts.MCD_DAI.address },
          { currency: MWETH, address: addContracts.ETH.address },
          ...tokens
        ]
      },
      additionalServices: [
        CDP_MANAGER,
        CDP_TYPE,
        AUCTION,
        SYSTEM_DATA,
        SAVINGS
      ],
      [CDP_TYPE]: [CdpTypeService, { cdpTypes, prefetch }],
      [CDP_MANAGER]: CdpManager,
      [SAVINGS]: SavingsService,
      [AUCTION]: AuctionService,
      [SYSTEM_DATA]: SystemDataService
    };
  }
};

export default McdPlugin;
