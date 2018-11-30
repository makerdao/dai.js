import PrivateService from '../../core/PrivateService';
import tokens from '../../../contracts/tokens';
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

  _getTokenAddress(symbol) {
    switch (symbol) {
      case 'MKR':
        return this._contractInfo().MKR[1].address;
      case 'WETH':
        return this._contractInfo().WETH[0].address;
      case 'PETH':
        return this._contractInfo().PETH[0].address;
      case 'DAI':
        return this._contractInfo().DAI[0].address;
    }
  }

  _contractInfo() {
    return contractInfo(this.get('proxy')._network());
  }

  _otc() {
    return this.get('smartContract').getContractByName(contracts.MAKER_OTC);
  }

  _oasisDirect() {
    return this.get('smartContract').getContractByName(contracts.OASIS_PROXY);
  }

  async sellAllAmount(payTokenSymbol, buyTokenSymbol, payAmount) {
    const payToken = this._getToken(payTokenSymbol);
    const buyToken = this._getToken(buyTokenSymbol);
    const amount = this._valueForContract(payAmount, payTokenSymbol);
    const minBuyAmount = this._valueForContract(0, buyTokenSymbol);
    // const otc =

    return this._oasisDirect().sellAllAmount(
      addresses.MAKER_OTC,
      payToken,
      amount,
      buyToken,
      minBuyAmount
    );
  }
}
