import { createCurrency } from '@makerdao/currency';
import testnetAddresses from '../contracts/addresses/testnet.json';
import kovanAddresses from '../contracts/addresses/kovan.json';
import mainnetAddresses from '../contracts/addresses/mainnet.json';
import abiMap from '../contracts/abiMap';
import MigrationService from './MigrationService';
import { ServiceRoles as ServiceRoles_ } from './constants';
export const ServiceRoles = ServiceRoles_;
const { MIGRATION } = ServiceRoles;

// this implementation assumes that all contracts in kovan.json, mainnet.json are also in testnet.json
const allContracts = Object.entries(testnetAddresses).reduce(
  (contracts, [name, testnetAddress]) => {
    const abi = abiMap[name];

    if (abi) {
      contracts[name] = {
        abi,
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
export const SAI = createCurrency('SAI');
export const DAI = createCurrency('MDAI');
export const MKR = createCurrency('MKR');

function overrideContractAddresses(addressOverrides, contracts) {
  Object.entries(addressOverrides).forEach(([name, overrideAddress]) => {
    if (contracts[name]) {
      contracts[name] = { ...contracts[name], address: overrideAddress };
    }
  });

  return contracts;
}

export const MDAI_1 = createCurrency('MDAI_1');

export default {
  addConfig: (_, { addressOverrides } = {}) => {
    const addContracts = addressOverrides
      ? overrideContractAddresses(addressOverrides, allContracts)
      : allContracts;

    return {
      smartContract: { addContracts },
      token: {
        erc20: [
          {
            currency: OLD_MKR,
            decimals: 18,
            address: addContracts.OLD_MKR.address
          },
          { currency: MDAI_1, address: addContracts.MCD_DAI_1.address }
        ]
      },
      additionalServices: [MIGRATION],
      [MIGRATION]: MigrationService
    };
  }
};
