import { mapValues } from 'lodash';
import { createCurrency } from '@makerdao/dai';
import addresses from '../contracts/addresses/testnet.json';
import abiMap from '../contracts/abiMap.json';
import CdpManager from './CdpManager';
import CollateralService from './CollateralService';
import { ServiceRoles } from './constants';

const mcdContracts = mapValues(abiMap, (abiName, name) => ({
  // TODO add kovan and mainnet addresses
  address: addresses[name],
  abi: require(`../contracts/abis/${abiName}.json`)
}));

export const REP = createCurrency('REP');
export const DGX = createCurrency('DGX');

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
    additionalServices: [ServiceRoles.CDP_MANAGER, ServiceRoles.SYSTEM_DATA],
    [ServiceRoles.CDP_MANAGER]: CdpManager,
    [ServiceRoles.SYSTEM_DATA]: CollateralService
  })
};
