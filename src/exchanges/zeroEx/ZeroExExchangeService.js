import PrivateService from '../../core/PrivateService';
import Web3Service from '../../eth/Web3Service';
import SmartContractService from '../../eth/SmartContractService';
import EthereumTokenService from '../../eth/EthereumTokenService';
import GasEstimatorService from '../../eth/GasEstimatorService';
//import tokens from '../../../contracts/tokens';
//import contracts from '../../../contracts/contracts';

export default class ZeroExExchangeService extends PrivateService {
  static buildTestService(privateKey = null) {
    const service = new ZeroExExchangeService(),
      web3 = Web3Service.buildTestService(privateKey),
      smartContractService = SmartContractService.buildTestService(web3),
      ethereumTokenService = EthereumTokenService.buildTestService(
        smartContractService
      );

    service
      .manager()
      .inject('log', smartContractService.get('log'))
      .inject('web3', smartContractService.get('web3'))
      .inject('smartContract', smartContractService)
      .inject('ethereumToken', ethereumTokenService)
      .inject(
        'gasEstimator',
        GasEstimatorService.buildTestService(smartContractService.get('web3'))
      );

    return service;
  }

  constructor(name = 'zeroExExchange') {
    super(name, [
      'smartContract',
      'ethereumToken',
      'web3',
      'log',
      'gasEstimator'
    ]);
  }

  /*
daiAmount: amount of Dai to sell
tokenSymbol: symbol of token to buy
minFillAmount: minimum amount of token being bought required.  If this can't be met, the trade will fail
*/
  /*  sellDai(daiAmount, tokenSymbol, minFillAmount = '0') {
    const zeroExContract = this.get('smartContract').getContractByName(
      contracts.ZERO_EX_EXCHANGE
    );
    const daiToken = this.get('ethereumToken').getToken(tokens.DAI);
    const daiAddress = daiToken.address();
    const buyTokenAddress = this.get('ethereumToken')
      .getToken(tokenSymbol)
      .address();
    const daiAmountEVM = daiToken.toEthereumFormat(daiAmount);
    const minFillAmountEVM = daiToken.toEthereumFormat(minFillAmount);
  }*/
}
