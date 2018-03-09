import PrivateService from '../../services/PrivateService';
import SmartContractService from '../../services/SmartContractService';
import OasisOrder from './OasisOrder';
import GasEstimatorService from '../../services/GasEstimatorService';
import EthereumTokenService from '../../services/EthereumTokenService';
import makerOTC from './makerOTC';
import tokens from '../../../contracts/tokens';

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
  	const oasisContract = this.get('smartContract').getContractByAddressAndAbi('0x8cf1Cab422A0b6b554077A361f8419cDf122a9F9', makerOTC.interface);
  	const daiAddress = this.get('ethereumToken').getToken(tokens.DAI).address();
  	const buyTokenAddress = this.get('ethereumToken').getToken(tokenSymbol).address();
  	return oasisContract.sellAllAmount(daiAddress, daiAmount, buyTokenAddress, minFillAmount);
  }	

  buyDai(daiAmount, tokenSymbol, maxFillAmount = null){

  }

   getOasisOrder(txHash){
  	
  }

}