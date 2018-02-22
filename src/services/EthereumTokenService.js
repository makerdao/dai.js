import PrivateService from './PrivateService';
import tokens from '../../contracts/tokens';
import SmartContractService from './SmartContractService';
import mainnet from '../../contracts/addresses/mainnet'
import kovan from '../../contracts/addresses/kovan'

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
    /*this.get('web3').
    let tokenArray = [];
    for (var token in Object.keys(tokens)) {
      if (token === 'ETH') { tokenArray['ETH'] = [1];}

    }*/
  }

  getToken(symbol, version = null){
  }

}

