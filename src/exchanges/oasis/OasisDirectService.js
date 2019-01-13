import PrivateService from '../../core/PrivateService';
import { getCurrency, WETH, DAI } from '../../eth/Currency';
import contracts from '../../../contracts/contracts';
import { OasisSellOrder, OasisBuyOrder } from './OasisOrder';

// execute optional callbacks for allowance and build txns

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

  async sell(sell, buy, options) {
    const proxy = await this._requireProxy(sell);
    const method = this._setMethod(sell, buy, 'sellAllAmount', proxy);
    const sellToken = sell === 'ETH' ? 'WETH' : sell;
    const buyToken = buy === 'ETH' ? 'WETH' : buy;
    const minFillAmount = await this._minBuyAmount(
      buyToken,
      sellToken,
      options.value
    );
    const params = await this._buildParams(
      sell,
      sellToken,
      options.value,
      buyToken,
      minFillAmount,
      method
    );
    this._buildOptions(options, sell, method);

    if (proxy) await this.get('allowance').requireAllowance(sellToken, proxy);
    return OasisSellOrder.build(
      this._oasisDirect(),
      method,
      params,
      this.get('transactionManager'),
      buyToken === 'DAI' ? DAI : WETH,
      options
    );
  }

  async buy(buy, sell, options) {
    const proxy = await this._requireProxy(sell);
    const method = this._setMethod(sell, buy, 'buyAllAmount', proxy);
    const buyToken = buy === 'ETH' ? 'WETH' : buy;
    const sellToken = sell === 'ETH' ? 'WETH' : sell;
    const maxPayAmount = await this._maxPayAmount(
      sellToken,
      buyToken,
      options.value
    );
    const params = await this._buildParams(
      sell,
      buyToken,
      options.value,
      sellToken,
      maxPayAmount,
      method,
      false
    );
    this._buildOptions(options, sell, method);

    if (proxy) await this.get('allowance').requireAllowance(sellToken, proxy);
    return OasisBuyOrder.build(
      this._oasisDirect(),
      method,
      params,
      this.get('transactionManager'),
      options
    );
  }

  setSlippageLimit(limit) {
    return (this._slippage = limit);
  }

  async getBuyAmount(buyToken, payToken, sellAmount) {
    this._buyAmount = await this._otc().getBuyAmount(
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

  async getPayAmount(payToken, buyToken, buyAmount) {
    this._payAmount = await this._otc().getPayAmount(
      this.get('token')
        .getToken(payToken)
        .address(),
      this.get('token')
        .getToken(buyToken)
        .address(),
      this._valueForContract(buyAmount, buyToken)
    );
    return this._payAmount;
  }

  async _minBuyAmount(buyToken, payToken, payAmount) {
    const buyAmount = this._buyAmount
      ? this._buyAmount
      : await this.getBuyAmount(buyToken, payToken, payAmount);
    return this._valueForContract(buyAmount * (1 - this._slippage), buyToken);
  }

  async _maxPayAmount(payToken, buyToken, buyAmount) {
    // Double check if this should handle rounding
    const payAmount = this._payAmount
      ? this._payAmount
      : await this.getPayAmount(payToken, buyToken, buyAmount);
    return this._valueForContract(payAmount * (1 + this._slippage), payToken);
  }

  _setMethod(sellToken, buyToken, method, proxy) {
    if (buyToken === 'ETH') {
      return (method += 'BuyEth');
    } else if (sellToken === 'ETH' && !proxy) {
      return (
        'createAnd' +
        method.charAt(0).toUpperCase() +
        method.slice(1) +
        'PayEth'
      );
    } else if (sellToken === 'ETH') {
      return (method += 'PayEth');
    } else {
      return method;
    }
  }

  async _requireProxy(sellCurrency) {
    const proxy = await this.get('proxy').currentProxy();

    if (proxy) {
      return proxy;
    } else if (!proxy && sellCurrency !== 'ETH') {
      return await this.get('proxy').requireProxy();
    } else {
      return false;
    }
  }

  async _buildParams(
    sellToken,
    sendToken,
    amount,
    buyToken,
    limit,
    method,
    sell = true
  ) {
    const otcAddress = this._otc().address;
    const wethAddress = this.get('token')
      .getToken('WETH')
      .address();
    const buyTokenAddress = this.get('token')
      .getToken(buyToken)
      .address();
    const sellTokenAddress = this.get('token')
      .getToken(sendToken)
      .address();
    const orderAmount = this._valueForContract(amount, sendToken);

    if (method.includes('create')) {
      return this._createAndExecuteParams(
        otcAddress,
        buyTokenAddress,
        orderAmount,
        limit,
        sell
      );
    } else if (sellToken === 'ETH') {
      return [
        otcAddress,
        sell ? wethAddress : buyTokenAddress,
        sell ? buyTokenAddress : limit,
        sell ? limit : wethAddress
      ];
    } else {
      return [
        otcAddress,
        sellTokenAddress,
        orderAmount,
        buyTokenAddress,
        limit
      ];
    }
  }

  _createAndExecuteParams(
    otcAddress,
    buyTokenAddress,
    amount,
    minBuyAmount,
    sell
  ) {
    const registryAddress = this.get('smartContract').getContractByName(
      'PROXY_REGISTRY'
    ).address;

    return [
      registryAddress,
      otcAddress,
      buyTokenAddress,
      sell ? minBuyAmount : amount
    ];
  }

  _buildOptions(options, sellToken, method) {
    if (sellToken === 'ETH') {
      options.value = this._valueForContract(options.value, 'WETH');
    } else {
      delete options.value;
    }
    options.otc = this._otc();
    if (!method.includes('create')) options.dsProxy = true;
    return options;
  }

  _oasisDirect() {
    return this.get('smartContract').getContractByName(contracts.OASIS_PROXY);
  }

  _otc() {
    return this.get('smartContract').getContractByName(contracts.MAKER_OTC);
  }

  _valueForContract(amount, symbol) {
    const token = this.get('token').getToken(symbol);
    return getCurrency(amount, token).toEthersBigNumber('wei');
  }
}
