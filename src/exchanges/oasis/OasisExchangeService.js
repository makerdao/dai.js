import PrivateService from '../../core/PrivateService';
import SmartContractService from '../../eth/SmartContractService';
//import OasisOrder from './OasisOrder';
import GasEstimatorService from '../../eth/GasEstimatorService';
import EthereumTokenService from '../../eth/EthereumTokenService';
import tokens from '../../../contracts/tokens';
import contracts from '../../../contracts/contracts';

export default class OasisExchangeService extends PrivateService {

  static buildEthersService() {
    const service = new OasisExchangeService();
    const smartContractService = SmartContractService.buildEthersService();
    const ethereumTokenService = EthereumTokenService.buildEthersService(smartContractService);
    service.manager()
      .inject('log', smartContractService.get('log'))
      .inject('web3', smartContractService.get('web3'))
      .inject('smartContract', smartContractService)
      .inject('ethereumToken', ethereumTokenService)
      .inject('gasEstimator', GasEstimatorService.buildTestService(smartContractService.get('web3')));
    return service;
  }

  constructor(name = 'oasisExchange') {
    super(name, ['smartContract', 'ethereumToken', 'web3', 'log', 'gasEstimator']);
  }

  sellDai(daiAmount, tokenSymbol, minFillAmount = 0){
  	const oasisContract = this.get('smartContract').getContractByName(contracts.MAKER_OTC);
  	const daiAddress = this.get('ethereumToken').getToken(tokens.DAI).address();
  	const buyTokenAddress = this.get('ethereumToken').getToken(tokenSymbol).address();
  	return oasisContract.sellAllAmount(daiAddress, daiAmount, buyTokenAddress, minFillAmount);
  }	

  buyDai(daiAmount, tokenSymbol, maxFillAmount = null){

  }

   getOasisOrder(txHash){
  	
  }

}