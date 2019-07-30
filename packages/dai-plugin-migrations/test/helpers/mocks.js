import BigNumber from 'bignumber.js';
import { RAY } from '../../src/constants';
import { bytesToString } from './';

export const globalSettlement = {
  beforeCage: () => ({
    live: async () => true,
    tags: async () => new BigNumber(0)
  }),
  afterCage: () => ({
    live: async () => false,
    tags: async () => new BigNumber(0)
  }),
  afterCageCollateral: tags => ({
    live: async () => false,
    tags: async ilk => {
      const ilkAsString = bytesToString(ilk);
      return (
        RAY.times(new BigNumber(1).div(tags[ilkAsString])) || new BigNumber(0)
      );
    }
  })
};

export function mockContracts(
  smartContractService,
  contractToMockImplementation
) {
  const originalGetContract = smartContractService.getContractByName.bind(
    smartContractService
  );
  return jest
    .spyOn(smartContractService, 'getContract')
    .mockImplementation(contractName => {
      const contract = contractToMockImplementation[contractName];
      if (contract) {
        return contract;
      } else {
        return originalGetContract(contractName);
      }
    });
}
