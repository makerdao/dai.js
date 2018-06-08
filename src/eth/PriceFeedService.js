import PrivateService from '../core/PrivateService';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';

import { utils } from 'ethers';
import util from 'ethereumjs-util';

export default class PriceFeedService extends PrivateService {
  /**
   * @param {string} name
   */

  constructor(name = 'priceFeed') {
    super(name, ['token', 'smartContract', 'transactionManager']);
  }

  _getContract(contract) {
    return this.get('smartContract').getContractByName(contract);
  }

  _toEthereumFormat(value) {
    return util.bufferToHex(
      util.setLengthLeft(
        utils.hexlify(
          this.get('token')
            .getToken(tokens.WETH)
            .toEthereumFormat(value)
        ),
        32
      )
    );
  }

  _toUserFormat(value) {
    return this.get('token')
      .getToken(tokens.WETH)
      .toUserFormat(value);
  }

  getEthPrice() {
    return this._getContract(contracts.SAI_PIP)
      .read()
      .then(price => this._toUserFormat(price));
  }

  setEthPrice(newPrice) {
    const adjustedPrice = this._toEthereumFormat(newPrice);

    return this.get('transactionManager').createTransactionHybrid(
      this._getContract(contracts.SAI_PIP).poke(adjustedPrice)
    );
  }

  getMkrPrice() {
    return this._getContract(contracts.SAI_PEP)
      .peek()
      .then(price => this._toUserFormat(price[0]));
  }

  setMkrPrice(newPrice) {
    const adjustedPrice = this._toEthereumFormat(newPrice);

    return this.get('transactionManager').createTransactionHybrid(
      this._getContract(contracts.SAI_PEP).poke(adjustedPrice)
    );
  }
}
