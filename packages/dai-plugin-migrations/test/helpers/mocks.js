import BigNumber from 'bignumber.js';
import { RAY } from '../../src/constants';
import { bytesToString } from './';

export async function mockCdpIds(maker, { forAccount, forProxy } = {}) {
  const currentAddress = maker.currentAddress();
  const currentProxy = await maker.currentProxy();

  maker.service('cdp').getCdpIds = jest.fn().mockImplementation(addr => {
    if (addr === currentAddress) {
      return forAccount || [];
    } else if (addr === currentProxy) {
      return forProxy || [];
    } else {
      return [];
    }
  });
}

export const globalSettlement = {
  beforeCage: () => ({
    live: async () => new BigNumber(1),
    tag: async () => new BigNumber(0),
    fix: async () => new BigNumber(0)
  }),
  afterCage: () => ({
    live: async () => new BigNumber(0),
    tag: async () => new BigNumber(0),
    fix: async () => new BigNumber(0)
  }),
  afterCageCollateral: tags => ({
    live: async () => new BigNumber(0),
    tag: async ilk => {
      const ilkAsString = bytesToString(ilk);
      return tags[ilkAsString]
        ? RAY.times(new BigNumber(1).div(tags[ilkAsString]))
        : new BigNumber(0);
    },
    fix: async () => new BigNumber(0)
  }),
  afterFlow: fixes => ({
    live: async () => new BigNumber(0),
    fix: async ilk => {
      const ilkAsString = bytesToString(ilk);
      return fixes[ilkAsString]
        ? RAY.times(fixes[ilkAsString])
        : new BigNumber(0);
    }
  })
};

export function mockContracts(
  smartContractService,
  contractToMockImplementation
) {
  const originalGetContract = smartContractService.getContract.bind(
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
