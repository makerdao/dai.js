import PrivateService from '../../core/PrivateService';
import { getCurrency } from '../../eth/Currency';
import contracts from '../../../contracts/contracts';
import { contractInfo } from '../../../contracts/networks';

export default class OasisDirectService extends PrivateService {
  constructor(name = 'oasisDirect') {
    super(name, ['proxy', 'smartContract', 'token', 'exchange']);
  }

  _valueForContract(amount, symbol) {
    return getCurrency(amount, symbol).toEthersBigNumber('wei');
  }

  async getBalance(token) {
    return await this.get('token')
      .getToken(token)
      .balanceOf(
        this.get('smartContract')
          .get('web3')
          .currentAccount()
      );
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

  _oasisDirect() {
    return this.get('smartContract').getContractByName(contracts.OASIS_PROXY);
  }

  _buildParams() {
    return [
      this._getContractAddress('MAKER_OTC'),
      this._getContractAddress(this._payToken),
      this._valueForContract(this._value, this._payToken),
      this._getContractAddress(this._buyToken),
      this._limit()
    ];
  }

  _limit() {
    let threshold;
    if (
      (this._payToken === 'DAI' && this._buyToken === 'ETH') ||
      (this._payToken === 'DAI' && this._buyToken === 'ETH')
    ) {
      threshold = 2;
    } else {
      threshold = 1;
    }
    return this._operation.includes('sellAll')
      ? this._valueForContract(this._value * (1 - threshold), 'eth')
      : this._valueForContract(this._value * (1 + threshold).round(0), 'eth');
  }

  _setTradeState(operation, payToken, buyToken, amount) {
    this._operation = operation;
    this._payToken = payToken;
    this._buyToken = buyToken;
    this._value = amount;
  }

  _trade() {
    const params = this._buildParams();
    return this._oasisDirect()[this._operation](...params, { dsProxy: true });
  }
}

const tradeOps = ['sellAllAmount'];

Object.assign(
  OasisDirectService.prototype,
  tradeOps.reduce((exchange, name) => {
    exchange[name] = function(...args) {
      this._setTradeState(name, ...args);
      return this._trade();
    };
    return exchange;
  }, {})
);
