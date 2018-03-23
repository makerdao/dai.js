import PrivateService from '../../core/PrivateService';
import Web3Service from '../../eth/Web3Service';
import SmartContractService from '../../eth/SmartContractService';
import EthereumTokenService from '../../eth/EthereumTokenService';
import OasisOrder from './OasisOrder';
import GasEstimatorService from '../../eth/GasEstimatorService';
import tokens from '../../../contracts/tokens';
import contracts from '../../../contracts/contracts';
import testAccountProvider from '../../../src/utils/TestAccountProvider';

export default class OasisExchangeService extends PrivateService {

  static buildKovanService() {
    const service = new OasisExchangeService(),
      web3 = Web3Service.buildInfuraService('kovan', '0xa69d30145491b4c1d55e52453cabb2e73a9daff6326078d49376449614d2f700'),
      smartContractService = SmartContractService.buildTestService(web3),
      ethereumTokenService = EthereumTokenService.buildTestService(smartContractService);

    service.manager()
      .inject('log', smartContractService.get('log'))
      .inject('web3', smartContractService.get('web3'))
      .inject('smartContract', smartContractService)
      .inject('ethereumToken', ethereumTokenService)
      .inject('gasEstimator', GasEstimatorService.buildTestService(smartContractService.get('web3')));

    return service;
  }

  static buildTestService(privateKey = null) {
    const service = new OasisExchangeService(),
      web3 = Web3Service.buildTestService(privateKey),
      smartContractService = SmartContractService.buildTestService(web3),
      ethereumTokenService = EthereumTokenService.buildTestService(smartContractService);

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
  	//return oasisContract.sellAllAmount(daiAddress, daiAmount, buyTokenAddress, minFillAmount);
    return new OasisOrder(oasisContract.sellAllAmount(daiAddress, daiAmount, buyTokenAddress, minFillAmount), this.get('web3').ethersProvider());
  }

  /*offer(payAmount, payTokenAddress, buyAmount, buyTokenAddress, pos){
    const oasisContract = this.get('smartContract').getContractByName(contracts.MAKER_OTC);
    return new OasisOrder(oasisContract.offer(payAmount, payTokenAddress, buyAmount, buyTokenAddress, pos));
  }*/

  buyDai(daiAmount, tokenSymbol, maxFillAmount = null){
    const oasisContract = this.get('smartContract').getContractByName(contracts.MAKER_OTC);
    const daiAddress = this.get('ethereumToken').getToken(tokens.DAI).address();
    const sellTokenAddress = this.get('ethereumToken').getToken(tokenSymbol).address();
    return new OasisOrder(oasisContract.buyAllAmount(daiAddress, daiAmount, sellTokenAddress, minFillAmount));
  }

}