import { mapValues } from 'lodash';
import addresses from '../contracts/addresses/testnet.json';
import abiMap from '../contracts/abiMap.json';

// TODO change to '@makerdao/dai' when turning into a separate module
import { createCurrency } from '../../../src';

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
    }
  })
};
