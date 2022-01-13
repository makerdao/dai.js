import assert from 'assert';
import mapValues from 'lodash/mapValues';
import reduce from 'lodash/reduce';
import uniqBy from 'lodash/uniqBy';
import testnetAddresses from '../contracts/addresses/testnet.json';
// import kovanAddresses from '../contracts/addresses/kovan.json';
import goerliAddresses from '../contracts/addresses/goerli.json';
import mainnetAddresses from '../contracts/addresses/mainnet.json';
import abiMap from '../contracts/abiMap';
import CdpManager from './CdpManager';
import SavingsService from './SavingsService';
import CdpTypeService from './CdpTypeService';
import AuctionService from './AuctionService';
import SystemDataService from './SystemDataService';
import { ServiceRoles as ServiceRoles_ } from './constants';
import BigNumber from 'bignumber.js';
import wethAbi from '../contracts/abis/WETH9.json';
import { defaultCdpTypes, DAI, WETH } from './tokens';
export const ServiceRoles = ServiceRoles_;
const { CDP_MANAGER, CDP_TYPE, SYSTEM_DATA, AUCTION, SAVINGS } = ServiceRoles;

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
          goerlifork: goerliAddresses[name],
          // kovan no longer actively supported
          // kovan: kovanAddresses[name],
          goerli: goerliAddresses[name],
          mainnet: mainnetAddresses[name]
        }
      };
    }
    return result;
  },
  {}
);
export * from './tokens';

export const ALLOWANCE_AMOUNT = new BigNumber(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
);

export const McdPlugin = {
  addConfig: (
    _,
    {
      cdpTypes = defaultCdpTypes,
      addressOverrides = null,
      prefetch = true
    } = {}
  ) => {
    if (addressOverrides) {
      addContracts = mapValues(addContracts, (contractDetails: any, name) => ({
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
          { currency: DAI, address: (addContracts as any).MCD_DAI.address },
          {
            currency: WETH,
            address: (addContracts as any).ETH.address,
            abi: wethAbi
          },
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
