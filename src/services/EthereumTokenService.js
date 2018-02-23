import PrivateService from './PrivateService';
import tokens from '../../contracts/tokens';
import SmartContractService from './SmartContractService';
import networks from '../../contracts/networks';

export default class EthereumTokenService extends PrivateService {

  static buildTestService() {
	    const service = new EthereumTokenService();
	    const smartContractService = SmartContractService.buildTestService();
	    service.manager()
	      .inject('log', smartContractService.get('log'))
	      .inject('web3', smartContractService.get('web3'))
	      .inject('smartContract', smartContractService);
	    return service;
	 }

  constructor(name = 'ethereumToken') {
    	super(name, ['smartContract', 'web3', 'log']);
  }

  getTokens() {
    return Object.keys(tokens);
  }

  getTokenVersions(){
    const mapping = this._getCurrentNetworkMapping();
    return this._selectTokenVersions(mapping);
  }

  getToken(symbol, version = null){
    if (!(this.getTokens().includes(symbol))) {
      throw new Error("provided token is not a symbol");
    }
  }

  _getCurrentNetworkMapping(){
    let networkID = 1; //_web3Promise(_ => this.get('web3')._web3.version.getNetwork(_)); // why can I not do the usual pass-through function on the web3 service?
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