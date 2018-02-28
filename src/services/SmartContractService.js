import PublicService from './PublicService';
import Web3Service from '../web3/Web3Service';

export default class SmartContractService extends PublicService {

  static buildTestService() {
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

  // abi must be passed in.
  // change to check web3 for network and provider
  getContractByAddressAndAbi(address, abi, network = 'kovan', ethersProvider = 'null') {
    
    var provider = ethers.providers.getDefaultProvider(network);
    var contract = new ethers.Contract(address, abi, provider);
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
