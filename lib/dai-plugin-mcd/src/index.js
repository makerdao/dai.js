import { mapValues } from 'lodash';
import Maker from '@makerdao/dai';
import addresses from '../contracts/addresses/testnet.json';
import abiMap from '../contracts/abiMap.json';
import CdpManager from './CdpManager';
import CdpTypeService from './CdpTypeService';
import AuctionService from './AuctionService';
import SystemDataService from './SystemDataService';
import { ServiceRoles } from './constants';
const { createCurrency, createCurrencyRatio, USD } = Maker;
const { CDP_MANAGER, CDP_TYPE, SYSTEM_DATA, AUCTION } = ServiceRoles;

const mcdContracts = mapValues(abiMap, (abiName, name) => ({
  // TODO add kovan and mainnet addresses
  address: addresses[name],
  abi: require(`../contracts/abis/${abiName}.json`)
}));

export const REP = createCurrency('REP');
export const DGX = createCurrency('DGX');
export const MDAI = createCurrency('MDAI');

export const USD_REP = createCurrencyRatio(USD, REP);
export const USD_DGX = createCurrencyRatio(USD, DGX);

export default {
  addConfig: (_, { cdpTypes }) => ({
    smartContract: {
      addContracts: mcdContracts
    },
    token: {
      erc20: [
        {
          currency: REP,
          symbol: REP.symbol,
          ...mcdContracts.REP
        },
        {
          currency: DGX,
          symbol: DGX.symbol,
          ...mcdContracts.DGX
        },
        {
          currency: MDAI,
          symbol: MDAI.symbol,
          ...mcdContracts.MCD_DAI
        }
      ]
    },
    additionalServices: [CDP_MANAGER, CDP_TYPE, AUCTION, SYSTEM_DATA],
    [CDP_TYPE]: [CdpTypeService, { cdpTypes }],
    [CDP_MANAGER]: CdpManager,
    [AUCTION]: AuctionService,
    [SYSTEM_DATA]: SystemDataService
  })
};
