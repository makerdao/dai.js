import { mapValues } from 'lodash';
import Maker from '@makerdao/dai';
import addresses from '../contracts/addresses/testnet.json';
import abiMap from '../contracts/abiMap.json';
import CdpManager from './CdpManager';
import { ServiceRoles } from './constants';
const { createCurrency, createCurrencyRatio, USD } = Maker;

const mcdContracts = mapValues(abiMap, (abiName, name) => ({
  // TODO add kovan and mainnet addresses
  address: addresses[name],
  abi: require(`../contracts/abis/${abiName}.json`)
}));

export const REP = createCurrency('REP');
export const DGX = createCurrency('DGX');

export const USD_REP = createCurrencyRatio(USD, REP);
export const USD_DGX = createCurrencyRatio(USD, DGX);

export default {
  addConfig: () => ({
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
        }
      ]
    },
    additionalServices: [ServiceRoles.CDP_MANAGER],
    [ServiceRoles.CDP_MANAGER]: CdpManager
  })
};
