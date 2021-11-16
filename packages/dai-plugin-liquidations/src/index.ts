import { map, prop } from 'ramda';
import { ALL_CLIPS, MCD_DOG } from './utils/constants';
import LiquidationService from './LiquidationService';

type ContractAddresses = {
  mainnet: { [key: string]: string };
  kovan: { [key: string]: string };
  goerli: { [key: string]: string };
  testnet?: { [key: string]: string };
};

export default {
  addConfig: function(config, { vulcanize = true }) {
    const contractAddresses: ContractAddresses = {
      mainnet: require('../contracts/addresses/mainnet.json'),
      kovan: require('../contracts/addresses/kovan.json'),
      goerli: require('../contracts/addresses/goerli.json')
    };

    try {
      contractAddresses.testnet = require('../contracts/addresses/testnet.json');
    } catch (err) {
      // do nothing here; throw an error only if we later attempt to use ganache
    }

    // iterate over all clips
    const addClips = ALL_CLIPS.reduce((acc, cur) => {
      acc[cur] = {
        address: map(prop(cur), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      };
      return acc;
    }, {});

    // add dog plus clips
    const addContracts = {
      [MCD_DOG]: {
        address: map(prop('MCD_DOG'), contractAddresses),
        abi: require('../contracts/abis/Dog.json')
      },
      ...addClips
    };

    return {
      ...config,
      additionalServices: ['liquidation'],
      liquidation: [LiquidationService, { vulcanize }],
      smartContract: { addContracts }
    };
  }
};
