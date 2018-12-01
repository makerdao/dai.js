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

  sellAllAmount(payToken, buyToken, payAmount) {
    const amount = this._valueForContract(payAmount, payToken);
    const minBuyAmount = this._valueForContract(1, buyToken);

    return this._oasisDirect().sellAllAmount(
      this._getContractAddress('MAKER_OTC'),
      this._getContractAddress(payToken),
      amount,
      this._getContractAddress(buyToken),
      minBuyAmount,
      {
        dsProxy: true
      }
    );
  }
}
