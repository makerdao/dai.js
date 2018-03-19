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
    return new OasisOrder(oasisContract.sellAllAmount(daiAddress, daiAmount, buyTokenAddress, minFillAmount));
  }

  sellDaiSpoof(daiAmount, tokenSymbol, minFillAmount = 0){
    const extraAccount = testAccountProvider.nextAccount();
    const extraOasisExchangeService = OasisExchangeService.buildTestService(extraAccount.key);
    const dai = this.get('ethereumToken').getToken(tokens.DAI); //general structure problem? - I needed to authenticate for this to work, even though in reality that shouldn't be necessary
    const buyTokenAddress = this.get('ethereumToken').getToken(tokenSymbol).address();
    extraOasisExchangeService.manager().authenticate() 
      .then(() => {
        console.log('dai.address(): ', dai.address());
        console.log('this.get(\'web3\').ethersSigner()', this.get('web3').ethersSigner());
        console.log('extraAccount.address', extraAccount.address);
        console.log('daiAmount', daiAmount);
      });
    //first I need to create DAI!
    return new OasisOrder(dai.transferFromSigner(extraAccount.address, daiAmount));
    //actually, have mainAccount send Dai to extraAccount
    //if tokenSymbol is WETH extraAccount wraps ETH, then send WETH to mainAccount
  } 

  offer(payAmount, payTokenAddress, buyAmount, buyTokenAddress, pos){
    const oasisContract = this.get('smartContract').getContractByName(contracts.MAKER_OTC);
    return new OasisOrder(oasisContract.offer(payAmount, payTokenAddress, buyAmount, buyTokenAddress, pos));
  }

  buyDai(daiAmount, tokenSymbol, maxFillAmount = null){

  }

  getOasisOrder(txHash){
  	
  }

}