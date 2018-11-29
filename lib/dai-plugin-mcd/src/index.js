import { mapValues } from 'lodash';
import addresses from '../contracts/addresses/testnet.json';
import abiMap from '../contracts/abiMap.json';

const mcdContracts = mapValues(abiMap, (abiName, name) => {
  return {
    address: addresses[name],
    abi: require(`../contracts/abis/${abiName}.json`)
  };
});

export default {
  addConfig: () => ({
    smartContract: {
      addContracts: mcdContracts
    }
  })
};
