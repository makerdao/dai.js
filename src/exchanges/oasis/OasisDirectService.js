import PrivateService from '../../core/PrivateService';
import { getCurrency, DAI, MKR, WETH } from '../../eth/Currency';
import contracts from '../../../contracts/contracts';
import { OasisSellOrder, OasisBuyOrder } from './OasisOrder';

export default class OasisDirectService extends PrivateService {
  constructor(name = 'exchange') {
    super(name, [
      'proxy',
      'smartContract',
      'token',
      'cdp',
      'web3',
      'transactionManager',
      'allowance'
    ]);
    this._slippage = 0.02;
  }

  async sell(sellToken, buyToken, options) {
    const method = this._setMethod(buyToken, sellToken, 'sellAllAmount');
    const sendToken = sellToken === 'ETH' ? 'WETH' : sellToken;
    const receiveToken = buyToken === 'ETH' ? 'WETH' : buyToken;
    const sellAmount = options.value;
    if (sellToken !== 'ETH') delete options.value;
    options.otc = this.get('smartContract').getContractByName('MAKER_OTC');
    const minFillAmount = await this._minBuyAmount(
      receiveToken,
      sendToken,
      sellAmount
    );
    const params = await this._buildTradeParams(
      sendToken,
      sellAmount,
      receiveToken,
      minFillAmount
    );

    return OasisSellOrder.build(
      this._oasisDirect(),
      method,
      params,
      this.get('transactionManager'),
      WETH,
      options
    );
  }

  setSlippageLimit(limit) {
    return (this._slippage = limit);
  }

  async getBuyAmount(buyToken, payToken, sellAmount) {
    const otc = this.get('smartContract').getContractByName(
      contracts.MAKER_OTC
    );
    this._buyAmount = await otc.getBuyAmount(
      this.get('token')
        .getToken(buyToken)
        .address(),
      this.get('token')
        .getToken(payToken)
        .address(),
      this._valueForContract(sellAmount, buyToken)
    );
    return this._buyAmount;
  }

  async _minBuyAmount(buyToken, payToken, payAmount) {
    const buyAmount = this._buyAmount
      ? this._buyAmount
      : await this.getBuyAmount(buyToken, payToken, payAmount);
    return buyAmount * (1 - this._slippage);
  }

  _setMethod(buyToken, sellToken, method) {
    if (buyToken === 'ETH') {
      return (method += 'BuyEth');
    } else if (sellToken === 'ETH') {
      return (method += 'PayEth');
    } else {
      return method;
    }
  }

  // async getPayAmount() {
  //   const otc = this.get('smartContract').getContractByName(
  //     contracts.MAKER_OTC
  //   );
  //   return await otc.getPayAmount(
  //     this._getContractAddress(this._payToken),
  //     this._getContractAddress(this._buyToken),
  //     this._valueForContract(this._value, this._payToken)
  //   );
  // }

  async _buildTradeParams(sellToken, sellAmount, buyToken, minFillAmount) {
    return [
      this.get('smartContract').getContractByName('MAKER_OTC').address,
      this.get('token')
        .getToken(sellToken)
        .address(),
      this._valueForContract(sellAmount, sellToken),
      this.get('token')
        .getToken(buyToken)
        .address(),
      this._valueForContract(minFillAmount, buyToken)
    ];
  }

  _oasisDirect() {
    return this.get('smartContract').getContractByName(contracts.OASIS_PROXY);
  }

  async _checkProxy() {
    // Add optional callback for build here
    return this.get('proxy').currentProxy()
      ? true
      : await this.get('proxy').build();
  }

  // Ignore this function for now, it's related to
  // how I was getting the buy/pay amounts before
  // I fixed it

  // async _limit() {
  //   if (this._operation.includes('sellAll')) {
  //     const buyAmount = await this.getBuyAmount();
  //     return this._valueForContract(
  //       buyAmount * (1 - this._threshold()),
  //       this._buyToken
  //     );
  //   } else {
  //     const payAmount = await this.getPayAmount();
  //     const limit = Math.round(payAmount * (1 + this._threshold()));
  //     return this._valueForContract(limit, this._payToken);
  //   }
  // }

  _valueForContract(amount, symbol) {
    const token = this.get('token').getToken(symbol);
    return getCurrency(amount, token).toEthersBigNumber('wei');
  }
}
