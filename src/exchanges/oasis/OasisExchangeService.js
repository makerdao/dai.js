import PrivateService from '../../core/PrivateService';
import OasisSellOrder from './OasisSellOrder';
import OasisBuyOrder from './OasisBuyOrder';
import TransactionObject from '../../eth/TransactionObject';
import tokens from '../../../contracts/tokens';
import contracts from '../../../contracts/contracts';

export default class OasisExchangeService extends PrivateService {
  constructor(name = 'exchange') {
    super(name, [
      'cdp',
      'smartContract',
      'token',
      'web3',
      'log',
      'gasEstimator',
      'allowance',
      'transactionManager'
    ]);
  }

  /*
daiAmount: amount of Dai to sell
tokenSymbol: symbol of token to buy
minFillAmount: minimum amount of token being bought required.  If this can't be met, the trade will fail
*/
  sellDai(daiAmount, tokenSymbol, minFillAmount = '0') {
    const oasisContract = this.get('smartContract').getContractByName(
      contracts.MAKER_OTC
    );
    const daiToken = this.get('token').getToken(tokens.DAI);
    const daiAddress = daiToken.address();
    const buyTokenAddress = this.get('token')
      .getToken(tokenSymbol)
      .address();
    const daiAmountEVM = daiToken.toEthereumFormat(daiAmount);
    const minFillAmountEVM = daiToken.toEthereumFormat(minFillAmount);
    return this.get('allowance')
      .requireAllowance(tokens.DAI, oasisContract.getAddress())
      .then(() =>
        OasisSellOrder.buildOasisSellOrder(
          oasisContract,
          oasisContract.sellAllAmount(
            daiAddress,
            daiAmountEVM,
            buyTokenAddress,
            minFillAmountEVM,
            { gasLimit: 300000 }
          ),
          this.get('transactionManager')
        )
      );
  }

  /*
daiAmount: amount of Dai to buy
tokenSymbol: symbol of token to sell
maxFillAmount: If the trade can't be done without selling more than the maxFillAmount of selling token, it will fail
*/
  buyDai(daiAmount, tokenSymbol, maxFillAmount = '-1') {
    const oasisContract = this.get('smartContract').getContractByName(
      contracts.MAKER_OTC
    );
    const daiToken = this.get('token').getToken(tokens.DAI);
    const daiAddress = daiToken.address();
    const daiAmountEVM = daiToken.toEthereumFormat(daiAmount);
    const maxFillAmountEVM = daiToken.toEthereumFormat(maxFillAmount);
    const sellTokenAddress = this.get('token')
      .getToken(tokenSymbol)
      .address();
    return this.get('allowance')
      .requireAllowance(tokens.WETH, oasisContract.getAddress())
      .then(() =>
        OasisBuyOrder.buildOasisBuyOrder(
          oasisContract,
          oasisContract.buyAllAmount(
            daiAddress,
            daiAmountEVM,
            sellTokenAddress,
            maxFillAmountEVM,
            { gasLimit: 300000 }
          ),
          this.get('transactionManager')
        )
      );
  }

  //only used to set up a limit order on the local testnet
  async offer(
    payAmount,
    payTokenAddress,
    buyAmount,
    buyTokenAddress,
    pos,
    overrides
  ) {
    const oasisContract = this.get('smartContract').getContractByName(
      contracts.MAKER_OTC
    );
    return new TransactionObject(
      oasisContract.offer(
        payAmount,
        payTokenAddress,
        buyAmount,
        buyTokenAddress,
        pos,
        overrides
      ),
      this.get('web3')
    );
  }
}
