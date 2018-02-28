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

  /* will probably use web3.eth.getCode
  getContractByAddress(address, abi = null) {
    this.get('web3');
  }

  // mapping of name + version to address + abi.
  getContractByName(name, version = null) {

  }

  _getAddressByName(name, version = null) {

  }
  */
}
