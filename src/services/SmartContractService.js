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
    var kovanPrivateKey = '0xa69d30145491b4c1d55e52453cabb2e73a9daff6326078d49376449614d2f700';
    var infuraKey = 'ihagQOzC3mkRXYuCivDN';
    const web3Service = this.get('web3');
    var infuraProvider = new web3Service._ethers.providers.InfuraProvider('kovan', infuraKey);
    var wallet = new web3Service._ethers.Wallet(kovanPrivateKey, infuraProvider); //provider is optional, remove this, instead use .createSigner because this will work with other providers (e.g. metamask).  instead of injecting wallet, inject the signer
    var contract = new web3Service._ethers.Contract(address, abi, wallet);
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
    let networkID = 42;//parseInt(this.get('web3').getNetwork().toString(10), 10);
    const mapping = networks.filter((m)=> m.networkID === networkID);
    if (mapping.length < 1) {throw new Error('networkID not found');}
    return mapping[0].addresses;
  }
}
