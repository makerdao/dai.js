import PrivateService from '../core/PrivateService';
import SmartContractService from '../../src/eth/SmartContractService';
import tokens from '../../contracts/tokens';
import contracts from '../../contracts/contracts';

export default class EthereumCdpService extends PrivateService {
  static buildTestService() {
    const service = new EthereumCdpService();
    const smartContract = SmartContractService.buildTestService();
    service.manager().inject('smartContract', smartContract);
    return service;
  }

  /**
   * @param {string} name
   */
  constructor(name = 'cdp') {
    super(name, ['smartContract']);
  }

  openCdp() {
    const contract = this.get('smartContract'),
      tubContract = contract.getContractByName(contracts.TUB),
      ethersSigner = contract.get('web3').ethersSigner(),
      ethersUtils = contract.get('web3').ethersUtils();

    // Need to get the cdp ID, so set up a event listener for the LogNewCup event
    const eventPromise = new Promise((resolve, reject) => {
      tubContract.onlognewcup = function(address, cdpIdBytes32) {
        if (ethersSigner.address.toLowerCase() == address.toLowerCase()) {
          const cdpId = ethersUtils.bigNumberify(cdpIdBytes32).toNumber();
          resolve(cdpId);
          this.removeListener();
        }
      };
    });

    tubContract.open();

    return eventPromise;
  }
}
