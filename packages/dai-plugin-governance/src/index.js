import { map, prop } from 'ramda';
import {
  VOTE_PROXY_FACTORY,
  CHIEF,
  POLLING,
  ESM,
  END,
  PAUSE,
  MKR,
  IOU
} from './utils/constants';

import ChiefService from './ChiefService';
import VoteProxyService from './VoteProxyService';
import VoteProxyFactoryService from './VoteProxyFactoryService';
import GovPollingService from './GovPollingService';
import GovQueryApiService from './GovQueryApiService';
import EsmService from './EsmService';
import PauseService from './PauseService';

export default {
  addConfig: function(config, { network = 'mainnet', staging = false }) {
    const contractAddresses = {
      kovan: require('../contracts/addresses/kovan.json'),
      mainnet: require('../contracts/addresses/mainnet.json')
    };

    try {
      contractAddresses.testnet = require('../contracts/addresses/testnet.json');
    } catch (err) {
      // do nothing here; throw an error only if we later attempt to use ganache
    }

    const addressKey = network == 'ganache' ? 'testnet' : network;

    const esmContracts = {
      [ESM]: {
        address: map(prop('MCD_ESM'), contractAddresses),
        abi: require('../contracts/abis/ESM.json')
      },
      [END]: {
        address: map(prop('MCD_END'), contractAddresses),
        abi: require('../contracts/abis/End.json')
      }
    };

    const addContracts = {
      [CHIEF]: {
        address: map(prop('CHIEF'), contractAddresses),
        // TODO check for MCD-specific version of DSChief
        abi: require('../contracts/abis/DSChief.json')
      },
      [VOTE_PROXY_FACTORY]: {
        address: map(prop('VOTE_PROXY_FACTORY'), contractAddresses),
        abi: require('../contracts/abis/VoteProxyFactory.json')
      },
      [POLLING]: {
        address: map(prop('POLLING'), contractAddresses),
        abi: require('../contracts/abis/Polling.json')
      },
      [PAUSE]: {
        address: map(prop('PAUSE'), contractAddresses),
        abi: require('../contracts/abis/DSPause.json')
      },
      ...esmContracts
    };

    const makerConfig = {
      ...config,
      additionalServices: [
        'chief',
        'voteProxy',
        'voteProxyFactory',
        'govPolling',
        'govQueryApi',
        'esm',
        'pause'
      ],
      chief: [ChiefService],
      voteProxy: [VoteProxyService],
      voteProxyFactory: [VoteProxyFactoryService],
      govPolling: [GovPollingService],
      govQueryApi: [GovQueryApiService, { staging }],
      esm: [EsmService],
      pause: [PauseService],
      smartContract: { addContracts },
      token: {
        erc20: [
          {
            currency: MKR,
            symbol: MKR.symbol,
            address: contractAddresses[addressKey].GOV
          },
          {
            currency: IOU,
            symbol: IOU.symbol,
            address: contractAddresses[addressKey].IOU
          }
        ]
      }
    };

    return makerConfig;
  }
};
