import PrivateService from '../core/PrivateService';
import SmartContractService from '../../src/eth/SmartContractService';
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
    const eventPromise = new Promise(resolve => {
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

  shutCdp(cdpId) {
    const contract = this.get('smartContract'),
      tubContract = contract.getContractByName(contracts.TUB),
      ethersProvider = contract.get('web3').ethersProvider(),
      ethersUtils = contract.get('web3').ethersUtils();

    const hexCdpId = ethersUtils.hexlify(cdpId);

    return tubContract
      .shut(hexCdpId)
      .then(transaction => ethersProvider.waitForTransaction(transaction.hash))
      .then(() => {});
  }
}
