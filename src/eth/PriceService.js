import PrivateService from '../core/PrivateService';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';
import { RAY } from '../utils/constants';

import BigNumber from 'bignumber.js';
import { utils } from 'ethers';
import util from 'ethereumjs-util';
import CurrencyUnits from './CurrencyUnits';
const { ETH, PETH, MKR } = CurrencyUnits;

export default class PriceService extends PrivateService {
  /**
   * @param {string} name
   */

  constructor(name = 'price') {
    super(name, ['token', 'smartContract', 'transactionManager', 'event']);
  }

  initialize() {
    this.get('event').registerPollEvents({
      'price/ETH_USD': {
        price: () => this.getEthPrice()
      },
      'price/MKR_USD': {
        price: () => this.getMkrPrice()
      },
      'price/WETH_PETH': {
        ratio: () => this.getWethToPethRatio()
      }
    });
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

  getWethToPethRatio() {
    return this._getContract(contracts.SAI_TUB)
      .per()
      .then(bn => new BigNumber(bn.toString()).dividedBy(RAY).toNumber());
  }

  getEthPrice() {
    return this._getContract(contracts.SAI_PIP)
      .read()
      .then(value => ETH.fromWei(value));
  }

  getPethPrice() {
    return this._getContract(contracts.SAI_TUB)
      .tag()
      .then(value => PETH.fromRay(value));
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
      .then(([price]) => MKR.fromWei(price));
  }

  setMkrPrice(newPrice) {
    const adjustedPrice = this._toEthereumFormat(newPrice);

    return this.get('transactionManager').createTransactionHybrid(
      this._getContract(contracts.SAI_PEP).poke(adjustedPrice)
    );
  }
}
