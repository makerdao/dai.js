import PrivateService from './PrivateService';
/*
export default class TokenService extends PrivateService {


  constructor(name = 'token') {
    super(name, ['log', 'web3']);
  }

  getBalance(tokenSymbol) {
    this.get('token').contract(token).balanceOf(address)
    	.then(balance => balance);
  }

  transfer(token, fromAddress, toAddress, amount) {
  	this.getBalance(token, fromAddress)
  		.then(balance => {
  			if (balance > amount ) {
  				this.get('log').error('insufficient balance for transfer');
  			}
  			return this.get('web3').contract(token).transfer()

  		})
  }


}

//new version

//import mapping from ...;

export default class TokenService extends PrivateService{

	construct(version) {
		this._version = version;
	}

	getBalance(symbol, address) {
		return this._getToken(symbol, this._version).getBalance(address);
	}
	
	transfer(symbol, fromAddress, toAddress, amount) {
		return this._getToken(symbol, this._version).transfer(fromAddress, toAddress, amount);
	}
	
	_getToken(symbol, version = null) {
		// version == null denotes the latest version 
		const map = this._lookupTokenVersion(symbol, version);
		return this.get('smartContract').getContract(map.tokenAddress, map.abi);
	}
	
	_lookupTokenVersion(symbol, version) {
		// ... fetches the right {version, tokenAddress, abi} object from mapping
	}
}
*/