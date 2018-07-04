import PrivateService from '../core/PrivateService';
import contracts from '../../contracts/contracts';
import { RAY } from '../utils/constants';
import BigNumber from 'bignumber.js';
import { utils } from 'ethers';
import util from 'ethereumjs-util';
import { getCurrency, ETH, PETH, MKR } from './CurrencyUnits';

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

  _valueForContract(value, unit) {
    return util.bufferToHex(
      util.setLengthLeft(
        utils.hexlify(getCurrency(value, unit).toEthersBigNumber(18)),
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
      .then(ETH.wei);
  }

  getPethPrice() {
    return this._getContract(contracts.SAI_TUB)
      .tag()
      .then(PETH.ray);
  }

  setEthPrice(newPrice, unit = ETH) {
    const value = this._valueForContract(newPrice, unit);

    return this.get('transactionManager').createTransactionHybrid(
      this._getContract(contracts.SAI_PIP).poke(value)
    );
  }

  getMkrPrice() {
    return this._getContract(contracts.SAI_PEP)
      .peek()
      .then(([price]) => MKR.wei(price));
  }

  setMkrPrice(newPrice, unit = MKR) {
    const value = this._valueForContract(newPrice, unit);

    return this.get('transactionManager').createTransactionHybrid(
      this._getContract(contracts.SAI_PEP).poke(value)
    );
  }
}
