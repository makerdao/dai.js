import PrivateService from '../../core/PrivateService';
import { getCurrency, WETH, DAI, ETH } from '../../eth/Currency';
import contracts from '../../../contracts/contracts';
import { OasisSellOrder, OasisBuyOrder } from './OasisOrder';

// remove options param, make amount third non-optional param in sell and buy
// rename eth2daidirect

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

  async sell(sell, buy, amount) {
    const proxy = await this._requireProxy(sell);
    const method = this._setMethod(sell, buy, 'sellAllAmount', proxy);
    const sellToken = sell === 'ETH' ? 'WETH' : sell;
    const buyToken = buy === 'ETH' ? 'WETH' : buy;
    const minFillAmount = await this._minBuyAmount(buyToken, sellToken, amount);
    const params = await this._buildParams(
      sellToken,
      amount,
      buyToken,
      minFillAmount,
      method
    );
    const options = this._buildOptions(amount, sell, method);

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

  async buy(buy, sell, amount) {
    const proxy = await this._requireProxy(sell);
    const method = this._setMethod(sell, buy, 'buyAllAmount', proxy);
    const buyToken = buy === 'ETH' ? 'WETH' : buy;
    const sellToken = sell === 'ETH' ? 'WETH' : sell;
    const maxPayAmount = await this._maxPayAmount(sellToken, buyToken, amount);
    const params = await this._buildParams(
      buyToken,
      amount,
      sellToken,
      maxPayAmount,
      method
    );
    const options = this._buildOptions(amount, sell, method, maxPayAmount);

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
    const adjustedAmount = buyAmount * (1 - this._slippage);
    return ETH.wei(adjustedAmount).toEthersBigNumber('wei');
  }

  async _maxPayAmount(payToken, buyToken, buyAmount) {
    // Double check if this should handle rounding
    const payAmount = this._payAmount
      ? this._payAmount
      : await this.getPayAmount(payToken, buyToken, buyAmount);
    const adjustedAmount = payAmount * (1 + this._slippage);
    return ETH.wei(adjustedAmount).toEthersBigNumber('wei');
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

  async _buildParams(sendToken, amount, buyToken, limit, method) {
    const otcAddress = this._otc().address;
    const daiAddress = this.get('token')
      .getToken('DAI')
      .address();
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
    const registryAddress = this.get('smartContract').getContractByName(
      'PROXY_REGISTRY'
    ).address;

    switch (method) {
      case 'sellAllAmountPayEth':
        return [otcAddress, wethAddress, daiAddress, limit];
      case 'createAndSellAllAmountPayEth':
        return [registryAddress, otcAddress, daiAddress, limit];
      case 'buyAllAmountPayEth':
        return [otcAddress, daiAddress, orderAmount, wethAddress];
      case 'createAndBuyAllAmountPayEth':
        return [registryAddress, otcAddress, daiAddress, orderAmount];
      default:
        return [
          otcAddress,
          sellTokenAddress,
          orderAmount,
          buyTokenAddress,
          limit
        ];
    }
  }

  _buildOptions(amount, sellToken, method, maxPayAmount) {
    const options = {};
    if (method.toLowerCase().includes('buyallamountpayeth')) {
      options.value = maxPayAmount;
    } else if (sellToken === 'ETH') {
      options.value = this._valueForContract(amount, 'WETH');
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
