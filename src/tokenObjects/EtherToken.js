import Web3Service from '../web3/Web3Service';

export default class EtherToken {

	constructor(web3Service, gasEstimatorService) {
    	this._web3 = web3Service;
    	this._gasEstimator = gasEstimatorService;
    }

    allowance(tokenOwner, spender){ 
    	return Promise.resolve(Number.MAX_SAFE_INTEGER); //double check that this should be a promise
    }

	balanceOf(owner){ //returns a promise
		return this._web3.eth.getBalance(owner); //add this as a passthrough to the web3service
	}

	approve(spender, value){
		return true;
	}

	approveUnlimited(spender){ 
		return true;
	}

	transfer(fromAddress, toAddress, transferValue){ //returns a promise
		const tx = {from: fromAddress, to: toAddress, amount: transferValue};
		this._gasEstimator.setPercentage(1.2);
		const gasLimit = this._gasEstimator.estimateGasLimit(tx);
		return this._web3.eth.sendTransaction({from: fromAddress, to: toAddress, value: transferValue, gasLimit: gasLimit, gasPrice: 20000000000});
	}

}