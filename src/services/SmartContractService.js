import PublicService from './PublicService';

export default class SmartContractService extends PublicService {

  constructor(name = 'smartContract') {
    super(name, ['web3', 'log']);
  }

  // will probably use web3.eth.getCode
  getContractByAddress(address, abi = null) {
    this.get('web3');
  }

  // mapping of name + version to address + abi.
  getContractByName(name, version = null) {

  }

  _getAddressByName(name, version = null) {

  }
}


