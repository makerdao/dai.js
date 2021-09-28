import testnetAddresses from '../contracts/addresses/testnet.json';
import kovanAddresses from '../contracts/addresses/kovan.json';
import mainnetAddresses from '../contracts/addresses/mainnet.json';
import abiMap from '../contracts/abiMap';
import MigrationService from './MigrationService';
import { OLD_MKR, DAI_1 } from './tokens';
import { ServiceRoles as ServiceRoles_ } from './constants';
export * from './tokens';
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

function overrideContractAddresses(addressOverrides, contracts) {
  Object.entries(addressOverrides).forEach(([name, overrideAddress]) => {
    if (contracts[name]) {
      contracts[name] = { ...contracts[name], address: overrideAddress };
    }
  });

  return contracts;
}

export default {
  addConfig: (_, config: { addressOverrides?: any }) => {
    const addContracts =
      config && config.addressOverrides
        ? overrideContractAddresses(config.addressOverrides, allContracts)
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
          { currency: DAI_1, address: addContracts.MCD_DAI_1.address }
        ]
      },
      additionalServices: [MIGRATION],
      [MIGRATION]: MigrationService
    };
  }
};
