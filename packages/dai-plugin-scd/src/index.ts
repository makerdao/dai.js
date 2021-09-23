import mapValues from 'lodash/mapValues';
import reduce from 'lodash/reduce';
import { createCurrency, createCurrencyRatio } from '@makerdao/currency';
import testnetAddresses from '../contracts/addresses/testnet.json';
import kovanAddresses from '../contracts/addresses/kovan.json';
import mainnetAddresses from '../contracts/addresses/mainnet.json';
import abiMap from '../contracts/abiMap';
import EthereumCdpService from './EthereumCdpService';
import PriceService from './PriceService';
import TokenConversionService from './TokenConversionService';
import { ServiceRoles as ServiceRoles_ } from './utils/constants';
import BigNumber from 'bignumber.js';

export const ServiceRoles = ServiceRoles_;
const { CDP, PRICE, CONVERSION } = ServiceRoles;

// look up contract ABIs using abiMap.
// if an exact match is not found, prefix-match against keys ending in *, e.g.
// MCD_JOIN_ETH_B matches MCD_JOIN_*
// this implementation assumes that all contracts in kovan.json are also in testnet.json
let addContracts = reduce(
  testnetAddresses,
  (result, testnetAddress, name) => {
    let abi = abiMap[name];
    if (!abi) {
      const prefix = Object.keys(abiMap).find(
        k =>
          k.substring(k.length - 1) == '*' &&
          k.substring(0, k.length - 1) == name.substring(0, k.length - 1)
      );
      if (prefix) abi = abiMap[prefix];
    }
    if (abi) {
      result[name] = {
        abi,
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

export const WETH = createCurrency('WETH');
export const PETH = createCurrency('PETH');
export const SAI = createCurrency('SAI');

export const ALLOWANCE_AMOUNT = new BigNumber(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
);

export default {
  addConfig: (_, config: { addressOverrides?: any}) => {
    if (config && config.addressOverrides) {
      addContracts = mapValues(addContracts, (contractDetails, name) => ({
        ...contractDetails,
        address: config.addressOverrides[name] || contractDetails.address
      }));
    }

    BigNumber.config({ POW_PRECISION: 100 });

    return {
      smartContract: { addContracts },
      token: {
        erc20: [
          // { currency: PETH, address: addContracts.SKR.address },
          // { currency: WETH, address: addContracts.GEM.address },
          // { currency: MKR, address: addContracts.GOV.address },
          { currency: SAI, address: addContracts.SAI.address }
        ]
      },
      additionalServices: [CDP, PRICE, CONVERSION],
      [CDP]: EthereumCdpService,
      [PRICE]: PriceService,
      [CONVERSION]: TokenConversionService
    };
  }
};
