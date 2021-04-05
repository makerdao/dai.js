import { map, prop } from 'ramda';
import LiquidationService from './LiquidationService';

export const MCD_DOG = 'MCD_DOG';

export default {
  addConfig: function(config) {
    const contractAddresses = {
      kovan: require('../contracts/addresses/kovan.json'),
      mainnet: require('../contracts/addresses/mainnet.json')
    };

    try {
      contractAddresses.testnet = require('../contracts/addresses/testnet.json');
    } catch (err) {
      // do nothing here; throw an error only if we later attempt to use ganache
    }

    const addContracts = {
      [MCD_DOG]: {
        address: map(prop('MCD_DOG'), contractAddresses),
        abi: require('../contracts/abis/Dog.json')
      }
    };

    return {
      ...config,
      additionalServices: ['liquidation'],
      liquidation: LiquidationService,
      smartContract: { addContracts }
    };
  }
};
