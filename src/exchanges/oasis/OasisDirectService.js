import PrivateService from '../../core/PrivateService';
import { getCurrency, DAI, MKR, WETH } from '../../eth/Currency';
import contracts from '../../../contracts/contracts';
import { contractInfo } from '../../../contracts/networks';
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

  async sell(sellToken, buyToken, sellAmount) {
    const method = this._setMethod(buyToken, sellToken, 'sellAllAmount');
    const minFillAmount = await this._minBuyAmount(
      buyToken,
      sellToken,
      sellAmount
    );
    const params = await this._buildTradeParams(
      sellToken,
      sellAmount,
      buyToken,
      minFillAmount
    );

    return OasisSellOrder.build(
      this._oasisDirect(),
      method,
      params,
      this.get('transactionManager'),
      WETH,
      this.get('smartContract').getContractByName('MAKER_OTC')
    );
  }

  async getBuyAmount(buyToken, payToken, sellAmount) {
    const otc = this.get('smartContract').getContractByName(
      contracts.MAKER_OTC
    );
    this._buyAmount = await otc.getBuyAmount(
      this._getContractAddress(buyToken),
      this._getContractAddress(payToken),
      this._valueForContract(sellAmount, buyToken)
    );
    return this._buyAmount;
  }

  async _minBuyAmount(buyToken, payToken, payAmount) {
    const buyAmount = this._buyAmount
      ? this._buyAmount
      : await this.getBuyAmount(buyToken, payToken, payAmount);
    return buyAmount * 0.98;
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

  async getPayAmount() {
    const otc = this.get('smartContract').getContractByName(
      contracts.MAKER_OTC
    );
    return await otc.getPayAmount(
      this._getContractAddress(this._payToken),
      this._getContractAddress(this._buyToken),
      this._valueForContract(this._value, this._payToken)
    );
  }

  async _buildTradeParams(sellToken, sellAmount, buyToken, minFillAmount) {
    return [
      this._getContractAddress('MAKER_OTC'),
      this._getContractAddress(sellToken),
      this._valueForContract(sellAmount),
      this._getContractAddress(buyToken),
      this._valueForContract(minFillAmount)
    ];
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
    return getCurrency(amount, DAI).toEthersBigNumber('wei');
  }

  _getContractAddress(name) {
    switch (name) {
      case 'MKR':
        return this._contractInfo().MKR[1].address;
      case 'WETH':
        return this._contractInfo().WETH[0].address;
      case 'PETH':
        return this._contractInfo().PETH[0].address;
      case 'DAI':
        return this._contractInfo().DAI[0].address;
      case 'MAKER_OTC':
        return this._contractInfo().MAKER_OTC[0].address;
    }
  }

  _contractInfo() {
    return contractInfo(this.get('proxy')._network());
  }
}
