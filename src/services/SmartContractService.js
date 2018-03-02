import PublicService from './PublicService';
import Web3Service from '../web3/Web3Service';

export default class SmartContractService extends PublicService {

  static buildTestService() {
    const service = new SmartContractService();
    const web3 = Web3Service.buildTestService();
    service.manager()
      .inject('log', web3.get('log'))
      .inject('web3', web3);
    return service;
  }

  static buildEthersService() {
    const service = new SmartContractService();
    const web3 = Web3Service.buildEthersService();
    service.manager()
      .inject('log', web3.get('log'))
      .inject('web3', web3);
    return service;
  }

  static buildRemoteService() {

    const service = new SmartContractService();
    const web3 = Web3Service.buildRemoteService();
    service.manager()
      .inject('log', web3.get('log'))
      .inject('web3', web3);
    return service;
  }

  constructor(name = 'smartContract') {
    super(name, ['web3', 'log']);
  }

  // check web3 for the current wallet
  getContractByAddressAndAbi(address, abi) {
    var kovanPrivateKey = '0xa69d30145491b4c1d55e52453cabb2e73a9daff6326078d49376449614d2f700';
    var infuraKey = 'ihagQOzC3mkRXYuCivDN';
    const web3Service = this.get('web3');
    var infuraProvider = new web3Service._ethers.providers.InfuraProvider('kovan', infuraKey);
    var wallet = new web3Service._ethers.Wallet(kovanPrivateKey, infuraProvider);
    var contract = new web3Service._ethers.Contract(address, abi, wallet);
    return contract;
  }

  // mapping of name + version to address + abi.
  getContractByName(name, version = null) {
  // use mapping in /contracts/addresses
  // use _getAddressByName(name, version = null)
  }

  _getAddressByName(name, version = null) {

  }
}
