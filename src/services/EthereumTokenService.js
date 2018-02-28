import PrivateService from './PrivateService';
import tokens from '../../contracts/tokens';
import SmartContractService from './SmartContractService';
import networks from '../../contracts/networks';
import ERC20Token from '../tokenObjects/ERC20Token';
import EtherToken from '../tokenObjects/EtherToken';
import WethToken from '../tokenObjects/EtherToken';
import PethToken from '../tokenObjects/EtherToken';
import GasEstimatorService from '../services/GasEstimatorService';

export default class EthereumTokenService extends PrivateService {

  static buildTestService() {
	    const service = new EthereumTokenService();
	    const smartContractService = SmartContractService.buildTestService();
	    service.manager()
	      .inject('log', smartContractService.get('log'))
	      .inject('web3', smartContractService.get('web3'))
	      .inject('smartContract', smartContractService)
      .inject('gasEstimator', GasEstimatorService.buildTestService(smartContractService.get('web3'))); //I pass in web3 since both services depend on it
	    return service;
	 }

  static buildRemoteService() {
    const service = new EthereumTokenService();
    const smartContractService = SmartContractService.buildRemoteService();
    service.manager()
      .inject('log', smartContractService.get('log'))
      .inject('web3', smartContractService.get('web3'))
      .inject('smartContract', smartContractService)
      .inject('gasEstimator', GasEstimatorService.buildTestService(smartContractService.get('web3')));
    return service;
  }

  constructor(name = 'ethereumToken') {
    	super(name, ['smartContract', 'web3', 'log', 'gasEstimator']);
  }

  getTokens() {
    return Object.keys(tokens);
  }

  getTokenVersions(){
    const mapping = this._getCurrentNetworkMapping();
    return this._selectTokenVersions(mapping);
  }

  getToken(symbol, version = null){
    if (this.getTokens().indexOf(symbol) < 0) {
      throw new Error('provided token is not a symbol');
    }
    if (symbol === tokens.ETH) {
      return new EtherToken(this.get('web3'), this.get('gasEstimator'));
    }
    else{
      const mapping = this._getCurrentNetworkMapping();
      const tokenInfo = mapping[symbol];
      const tokenVersionData = (version === null) ? tokenInfo[tokenInfo.length - 1] : tokenInfo[version - 1]; //get last entry in array if version null
      const smartContractService = this.get('smartContract');
      //const contract = smartContractService.getContractByAddress(tokenVersionData.address, tokenVersionData.abi); //this doesn't exist yet
      if (symbol === tokens.WETH) {return new WethToken(contract);}
      if (symbol === tokens.PETH) {
        //const tub = smartContractService.getContractByName('TUB');
        return new PethToken(contract, tub);
      }
      return new ERC20Token(contract);
    }
  }

  _getCurrentNetworkMapping(){
    let networkID = parseInt(this.get('web3').getNetwork().toString(10), 10);
    const mapping = networks.filter((m)=> m.networkID === networkID);
    if (mapping.length < 1) {throw new Error('networkID not found');}
    return mapping[0].addresses;
  }

  _selectTokenVersions(mapping){
    const tokenArray = [];
    for (var token in tokens) {
      if (!(token in mapping)) {continue;}
      if (token === 'ETH') { tokenArray['ETH'] = [1];}
      else{
        let versionArray = [];
        mapping[token].forEach((e) => {
          versionArray.push(e.version);
        });
        tokenArray[token] = versionArray;
      }
    }
    return tokenArray;
  }



}