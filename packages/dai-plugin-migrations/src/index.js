import testnetAddresses from '../contracts/addresses/testnet.json';
import kovanAddresses from '../contracts/addresses/kovan.json';
import mainnetAddresses from '../contracts/addresses/mainnet.json';
import abiMap from '../contracts/abiMap.json';
import MigrationService from './MigrationService';
import { ServiceRoles as ServiceRoles_ } from './constants';
import { createCurrency } from '@makerdao/currency';
export const ServiceRoles = ServiceRoles_;
const { MIGRATION } = ServiceRoles;

// this implementation assumes that all contracts in kovan.json, mainnet.json are also in testnet.json
const allContracts = Object.entries(testnetAddresses).reduce(
  (contracts, [name, testnetAddress]) => {
    const abiName = abiMap[name];

    if (abiName) {
      contracts[name] = {
        abi: require(`../contracts/abis/${abiName}.json`),
        address: {
          testnet: testnetAddress,
          kovan: kovanAddresses[name],
          mainnet: mainnetAddresses[name]
        }
      };
    }

    return contracts;
  },
  {}
);

export const OLD_MKR = createCurrency('OLD_MKR');

function overrideContractAddresses(network, addressOverrides, contracts) {
  Object.entries(addressOverrides).forEach(([name, overrideAddress]) => {
    if (contracts[name]) {
      contracts[name] = {
        ...contracts[name],
        address: {
          [network]: overrideAddress || contracts[name].address[network]
        }
      };
    }
  });

  return contracts;
}

export default {
  addConfig: (_, { network = 'testnet', addressOverrides } = {}) => {
    const oldMkrData = {
      currency: OLD_MKR,
      abi: require('../contracts/abis/ERC20.json'),
      address: require(`../contracts/addresses/${network}.json`).OLD_MKR,
      decimals: 18
    };

    const addContracts = addressOverrides
      ? overrideContractAddresses(network, addressOverrides, allContracts)
      : allContracts;

    // remove contracts that don't have an address for the given network
    for (let c of Object.keys(addContracts)) {
      if (
        typeof addContracts[c].address === 'object' &&
        !addContracts[c].address[network]
      ) {
        delete addContracts[c];
      }
    }

    return {
      token: {
        erc20: [oldMkrData]
      },
      smartContract: { addContracts },
      additionalServices: [MIGRATION],
      [MIGRATION]: MigrationService
    };
  }
};
