import PrivateService from './PrivateService';
import tokens from '../../contracts/tokens';
import SmartContractService from './SmartContractService';


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

	}

	getToken(symbol, version = null){

	}

}
