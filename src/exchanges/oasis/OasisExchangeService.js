import PrivateService from '../../core/PrivateService';
import { OasisBuyOrder, OasisSellOrder } from './OasisOrder';
import contracts from '../../../contracts/contracts';
import { UINT256_MAX } from '../../utils/constants';
import { getCurrency, DAI, WETH } from '../../eth/Currency';

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

  _oasisProxy() {
    return this.get('smartContract').getContractByName(contracts.OASIS_PROXY);
  }

  /*
  daiAmount: amount of Dai to sell
  currency: currency to buy
  minFillAmount: minimum amount of token being bought required.  If this can't be met, the trade will fail
  */
  async sellDai(amount, currency, minFillAmount = 0) {
    const oasisContract = this.get('smartContract').getContractByName(
      contracts.MAKER_OTC
    );
    const daiToken = this.get('token').getToken(DAI);
    const daiAddress = daiToken.address();
    const buyToken = this.get('token').getToken(currency);
    const daiAmountEVM = daiValueForContract(amount);
    const minFillAmountEVM = daiValueForContract(minFillAmount);
    await this.get('allowance').requireAllowance(DAI, oasisContract.address);
    return OasisSellOrder.build(
      oasisContract,
      'sellAllAmount',
      [daiAddress, daiAmountEVM, buyToken.address(), minFillAmountEVM],
      this.get('transactionManager'),
      currency
    );
  }

  async createProxyAndBuyTokenWithEth(amount, buyToken, minAmount = 0) {
    const proxyFactory = this.get('smartContract').getContractByName(
      contracts.DS_PROXY_FACTORY
    ).address;
    const otc = this.get('smartContract').getContractByName(contracts.MAKER_OTC)
      .address;
    const token = this.get('token').getToken(buyToken)._contract.address;
    const formattedAmount = daiValueForContract(minAmount);
    const nonce = await this.get('transactionManager')
      .get('nonce')
      .getNonce();
    console.log(nonce);
    return this._oasisProxy().createAndSellAllAmountPayEth(
      proxyFactory,
      otc,
      token,
      formattedAmount,
      {
        nonce: nonce,
        value: daiValueForContract(amount)
      }
    );
  }

  /*
  daiAmount: amount of Dai to buy
  tokenSymbol: symbol of token to sell
  maxFillAmount: If the trade can't be done without selling more than the maxFillAmount of selling token, it will fail
  */
  async buyDai(amount, tokenSymbol, maxFillAmount = UINT256_MAX) {
    const oasisContract = this.get('smartContract').getContractByName(
      contracts.MAKER_OTC
    );
    const daiToken = this.get('token').getToken(DAI);
    const daiAddress = daiToken.address();
    const daiAmountEVM = daiValueForContract(amount);
    const maxFillAmountEVM = daiValueForContract(maxFillAmount);
    const sellTokenAddress = this.get('token')
      .getToken(tokenSymbol)
      .address();
    await this.get('allowance').requireAllowance(WETH, oasisContract.address);
    return OasisBuyOrder.build(
      oasisContract,
      'buyAllAmount',
      [daiAddress, daiAmountEVM, sellTokenAddress, maxFillAmountEVM],
      this.get('transactionManager')
    );
  }
}

function daiValueForContract(amount) {
  return getCurrency(amount, DAI).toEthersBigNumber('wei');
}
