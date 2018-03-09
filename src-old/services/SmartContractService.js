import PublicService from './PublicService';
import Web3Service from '../web3/Web3Service';
import contracts from '../../contracts/contracts';
import networks from '../../contracts/networks';

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
    this._provider = null;
  }

  // check web3 for the current wallet
  getContractByAddressAndAbi(address, abi) {
    const web3Service = this.get('web3');
    var contract = new web3Service._ethers.Contract(address, abi, web3Service._ethersWallet);
    return contract;
  }

  // mapping of name + version to address + abi.
  getContractByName(name, version = null) {
    if (Object.keys(contracts).indexOf(name) < 0) {
      throw new Error('provided name is not a contract');
    }
    const mapping = this._getCurrentNetworkMappingEthers();
    const tokenInfo = mapping[name];
    const tokenVersionData = (version === null) ? tokenInfo[tokenInfo.length - 1] : tokenInfo[version - 1]; //get last entry in array if version null
    return this.getContractByAddressAndAbi(tokenVersionData.address, tokenVersionData.abi);
  }

  //this is the same function that's in EthereumTokenService
  _getCurrentNetworkMappingEthers(){
    const web3Service = this.get('web3');
    let networkID = web3Service._ethersProvider.chainId;
    const mapping = networks.filter((m)=> m.networkID === networkID);
    if (mapping.length < 1) {throw new Error('networkID not found');}
    return mapping[0].addresses;
  }
}
