export const globalSettlement = {
  beforeCage: {
    live: async () => true
  },
  afterCage: {
    live: async () => false
  }
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
