import assert from 'assert';
import mapValues from 'lodash/mapValues';
import reduce from 'lodash/reduce';
import uniqBy from 'lodash/uniqBy';
import { createCurrency, createCurrencyRatio } from '@makerdao/currency';
import testnetAddresses from '../contracts/addresses/testnet.json';
import kovanAddresses from '../contracts/addresses/kovan.json';
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
          kovan: kovanAddresses[name],
          goerli: goerliAddresses[name],
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
export const DAI = createCurrency('DAI');

// Casting for savings dai
export const DSR_DAI = createCurrency('DSR-DAI');

export const REP = createCurrency('REP');
export const ZRX = createCurrency('ZRX');
export const KNC = createCurrency('KNC');
export const OMG = createCurrency('OMG');
export const BAT = createCurrency('BAT');
export const DGD = createCurrency('DGD');
export const GNT = createCurrency('GNT');
export const USDC = createCurrency('USDC');
export const WBTC = createCurrency('WBTC');
export const TUSD = createCurrency('TUSD');
export const MANA = createCurrency('MANA');
export const USDT = createCurrency('USDT');
export const PAXUSD = createCurrency('PAXUSD');
export const COMP = createCurrency('COMP');
export const LRC = createCurrency('LRC');
export const LINK = createCurrency('LINK');
export const YFI = createCurrency('YFI');
export const BAL = createCurrency('BAL');
export const GUSD = createCurrency('GUSD');
export const UNI = createCurrency('UNI');
export const RENBTC = createCurrency('RENBTC');
export const AAVE = createCurrency('AAVE');
export const UNIV2DAIETH = createCurrency('UNIV2DAIETH');
export const UNIV2WBTCETH = createCurrency('UNIV2WBTCETH');
export const UNIV2USDCETH = createCurrency('UNIV2USDCETH');
export const UNIV2DAIUSDC = createCurrency('UNIV2DAIUSDC');
export const UNIV2ETHUSDT = createCurrency('UNIV2ETHUSDT');
export const UNIV2LINKETH = createCurrency('UNIV2LINKETH');
export const UNIV2UNIETH = createCurrency('UNIV2UNIETH');
export const UNIV2WBTCDAI = createCurrency('UNIV2WBTCDAI');
export const UNIV2AAVEETH = createCurrency('UNIV2AAVEETH');
export const UNIV2DAIUSDT = createCurrency('UNIV2DAIUSDT');

export const defaultCdpTypes = [
  { currency: ETH, ilk: 'ETH-A' },
  { currency: ETH, ilk: 'ETH-B' },
  { currency: ETH, ilk: 'ETH-C' },
  { currency: BAT, ilk: 'BAT-A' },
  { currency: USDC, ilk: 'USDC-A', decimals: 6 },
  { currency: WBTC, ilk: 'WBTC-A', decimals: 8 },
  { currency: USDC, ilk: 'USDC-B', decimals: 6 },
  { currency: TUSD, ilk: 'TUSD-A', decimals: 18 },
  { currency: KNC, ilk: 'KNC-A', decimals: 18 },
  { currency: ZRX, ilk: 'ZRX-A', decimals: 18 },
  { currency: MANA, ilk: 'MANA-A', decimals: 18 },
  { currency: USDT, ilk: 'USDT-A', decimals: 6 },
  { currency: PAXUSD, ilk: 'PAXUSD-A', decimals: 18 },
  { currency: COMP, ilk: 'COMP-A', decimals: 18 },
  { currency: LRC, ilk: 'LRC-A', decimals: 18 },
  { currency: LINK, ilk: 'LINK-A', decimals: 18 },
  { currency: YFI, ilk: 'YFI-A', decimals: 18 },
  { currency: BAL, ilk: 'BAL-A', decimals: 18 },
  { currency: GUSD, ilk: 'GUSD-A', decimals: 2 },
  { currency: UNI, ilk: 'UNI-A', decimals: 18 },
  { currency: RENBTC, ilk: 'RENBTC-A', decimals: 8 },
  { currency: AAVE, ilk: 'AAVE-A', decimals: 18 },
  { currency: UNIV2DAIETH, ilk: 'UNIV2DAIETH-A', decimals: 18 },
  { currency: UNIV2WBTCETH, ilk: 'UNIV2WBTCETH-A', decimals: 18 },
  { currency: UNIV2USDCETH, ilk: 'UNIV2USDCETH-A', decimals: 18 },
  { currency: UNIV2DAIUSDC, ilk: 'UNIV2DAIUSDC-A', decimals: 18 },
  { currency: UNIV2ETHUSDT, ilk: 'UNIV2ETHUSDT-A', decimals: 18 },
  { currency: UNIV2LINKETH, ilk: 'UNIV2LINKETH-A', decimals: 18 },
  { currency: UNIV2UNIETH, ilk: 'UNIV2UNIETH-A', decimals: 18 },
  { currency: UNIV2WBTCDAI, ilk: 'UNIV2WBTCDAI-A', decimals: 18 },
  { currency: UNIV2AAVEETH, ilk: 'UNIV2AAVEETH-A', decimals: 18 },
  { currency: UNIV2DAIUSDT, ilk: 'UNIV2DAIUSDT-A', decimals: 18 }
];

export const SAI = createCurrency('SAI');

export const ALLOWANCE_AMOUNT = BigNumber(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
);

export const defaultTokens = [
  ...new Set([
    ...defaultCdpTypes.map(type => type.currency),
    DAI,
    WETH,
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
          { currency: DAI, address: addContracts.MCD_DAI.address },
          { currency: WETH, address: addContracts.ETH.address, abi: wethAbi },
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
