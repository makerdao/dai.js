import testnetAddresses from '../contracts/addresses/testnet.json';
import kovanAddresses from '../contracts/addresses/kovan.json';
import abiMap from '../contracts/abiMap.json';
import MigrationService from './MigrationService';
import { ServiceRoles as ServiceRoles_ } from './constants';
export const ServiceRoles = ServiceRoles_;
const { MIGRATION } = ServiceRoles;

// this implementation assumes that all contracts in kovan.json are also in testnet.json
function allContracts(network) {
  return Object.entries(testnetAddresses).reduce((acc, [name, testnetAddress]) => {
    const abiName = abiMap[name]
    if (abiName) {
      acc[name] = {
        abi: require(`../contracts/abis/${abiName}.json`),
        address: {
          testnet: testnetAddress,
          kovan: kovanAddresses[name]
        }
      }
    }

    return acc
  }, {});
}

export default {
  addConfig: (
    _,
    {
      cdpTypes = defaultCdpTypes,
      network = 'testnet',
      addressOverrides,
      prefetch = true
    } = {}
  ) => {
    return {
      smartContract: { allContracts },
      // token: {
      //   erc20: [
      //     { currency: MDAI, address: addContracts.MCD_DAI.address[network] },
      //     { currency: MWETH, address: addContracts.ETH.address[network] },
      //     ...tokens
      //   ]
      // },
      // additionalServices: [
      //   MIGRATION,
      // ],
      // [MIGRATION]: MigrationService,
    };
  }
};
