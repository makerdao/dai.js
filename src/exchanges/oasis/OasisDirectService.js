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

  async sell(sellToken, buyToken, sellAmount, minFillAmount = 0) {
    let method;
    const params = await this._buildTradeParams(
      sellToken,
      sellAmount,
      buyToken,
      minFillAmount
    );
    
    if (buyToken === 'ETH') {
      method = 'sellAllAmountBuyEth';
    } else if (sellToken === 'ETH') {
      method = 'sellAllAmountPayEth';
    } else {
      method = 'sellAllAmount';
    }

    return OasisSellOrder.build(
      this._oasisDirect(),
      method,
      params,
      this.get('transactionManager'),
      WETH,
      this.get('smartContract').getContractByName('MAKER_OTC')
    );
  }

  async getBuyAmount() {
    const otc = this.get('smartContract').getContractByName(
      contracts.MAKER_OTC
    );
    return await otc.getBuyAmount(
      this._getContractAddress(this._buyToken),
      this._getContractAddress(this._payToken),
      this._valueForContract(this._value, this._buyToken)
    );
  }

  // This takes an optional parameter in case a UI,
  // like Oasis Direct, needs to calculate the minimum
  // amount with respect to a value that's already been
  // given to the user
  async _minBuyAmount(estimatedAmount = null) {
    // This wasn't working without the amount param
    // when running sellAllAmount, but for some reason
    // works without the param in the unit test
    const buyAmount = estimatedAmount
      ? estimatedAmount
      : await this.getBuyAmount();
    return buyAmount * 0.98;
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
    // const limit = this._operation.includes('sell')
    //   ? await this._minBuyAmount('0.01')
    //   : await this._minPayAmount();
    console.log(buyToken);
    return [
      this._getContractAddress('MAKER_OTC'),
      this._getContractAddress(sellToken),
      this._valueForContract(sellAmount),
      this._getContractAddress(buyToken),
      this._valueForContract('0')
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
