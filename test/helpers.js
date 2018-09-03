import SmartContractService from '../src/eth/SmartContractService';

export function setupTestServices(manager, serviceList) {
  const serviceBuilders = {
    smartContract: () => SmartContractService.buildTestService(null, true)
    // TODO figure out how to add other service builders here and have them
    // depend on each other so we don't create more than one of each type
  };

  for (let name of serviceList) {
    manager.inject(name, serviceBuilders[name]());
  }
}
