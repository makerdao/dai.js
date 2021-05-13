import { map, prop } from 'ramda';
import LiquidationService from './LiquidationService';

export const MCD_DOG = 'MCD_DOG';
export const MCD_CLIP_AAVE_A = 'MCD_CLIP_AAVE_A';
export const MCD_CLIP_BAL_A = 'MCD_CLIP_BAL_A';
export const MCD_CLIP_BAT_A = 'MCD_CLIP_BAT_A';
export const MCD_CLIP_COMP_A = 'MCD_CLIP_COMP_A';
export const MCD_CLIP_ETH_A = 'MCD_CLIP_ETH_A';
export const MCD_CLIP_ETH_B = 'MCD_CLIP_ETH_B';
export const MCD_CLIP_ETH_C = 'MCD_CLIP_ETH_C';
export const MCD_CLIP_KNC_A = 'MCD_CLIP_KNC_A';
export const MCD_CLIP_LINK_A = 'MCD_CLIP_LINK_A';
export const MCD_CLIP_LRC_A = 'MCD_CLIP_LRC_A';
export const MCD_CLIP_MANA_A = 'MCD_CLIP_MANA_A';
export const MCD_CLIP_RENBTC_A = 'MCD_CLIP_RENBTC_A';
export const MCD_CLIP_UNI_A = 'MCD_CLIP_UNI_A';
export const MCD_CLIP_WBTC_A = 'MCD_CLIP_WBTC_A';
export const MCD_CLIP_YFI_A = 'MCD_CLIP_YFI_A';
export const MCD_CLIP_ZRX_A = 'MCD_CLIP_ZRX_A';

export default {
  addConfig: function(config, { vulcanize = true }) {
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
      },
      [MCD_CLIP_AAVE_A]: {
        address: map(prop('MCD_CLIP_AAVE_A'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      },
      [MCD_CLIP_BAL_A]: {
        address: map(prop('MCD_CLIP_BAL_A'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      },
      [MCD_CLIP_BAT_A]: {
        address: map(prop('MCD_CLIP_BAT_A'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      },
      [MCD_CLIP_COMP_A]: {
        address: map(prop('MCD_CLIP_COMP_A'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      },
      [MCD_CLIP_ETH_A]: {
        address: map(prop('MCD_CLIP_ETH_A'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      },
      [MCD_CLIP_ETH_B]: {
        address: map(prop('MCD_CLIP_ETH_B'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      },
      [MCD_CLIP_ETH_C]: {
        address: map(prop('MCD_CLIP_ETH_C'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      },
      [MCD_CLIP_KNC_A]: {
        address: map(prop('MCD_CLIP_KNC_A'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      },
      [MCD_CLIP_LINK_A]: {
        address: map(prop('MCD_CLIP_LINK_A'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      },
      [MCD_CLIP_LRC_A]: {
        address: map(prop('MCD_CLIP_LRC_A'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      },
      [MCD_CLIP_MANA_A]: {
        address: map(prop('MCD_CLIP_MANA_A'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      },
      [MCD_CLIP_RENBTC_A]: {
        address: map(prop('MCD_CLIP_RENBTC_A'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      },
      [MCD_CLIP_UNI_A]: {
        address: map(prop('MCD_CLIP_UNI_A'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      },
      [MCD_CLIP_WBTC_A]: {
        address: map(prop('MCD_CLIP_WBTC_A'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      },
      [MCD_CLIP_YFI_A]: {
        address: map(prop('MCD_CLIP_YFI_A'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      },
      [MCD_CLIP_ZRX_A]: {
        address: map(prop('MCD_CLIP_ZRX_A'), contractAddresses),
        abi: require('../contracts/abis/Clipper.json')
      }
    };

    return {
      ...config,
      additionalServices: ['liquidation'],
      liquidation: [LiquidationService, { vulcanize }],
      smartContract: { addContracts }
    };
  }
};
