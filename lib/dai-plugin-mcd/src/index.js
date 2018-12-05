import { mapValues } from 'lodash';
import { createCurrency } from '@makerdao/dai';
import addresses from '../contracts/addresses/testnet.json';
import abiMap from '../contracts/abiMap.json';
import MultiCdpService from './MultiCdpService';
import { ServiceRoles } from './constants';

const mcdContracts = mapValues(abiMap, (abiName, name) => ({
  // TODO add kovan and mainnet addresses
  address: addresses[name],
  abi: require(`../contracts/abis/${abiName}.json`)
}));

export const REP = createCurrency('REP');

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
          address: addresses.REP
        }
      ]
    },
    additionalServices: [ServiceRoles.MULTI_CDP],
    multiCdp: MultiCdpService
  }),
  delegateToServices: {
    multiCdp: ['openMultiCdp']
  }
};
