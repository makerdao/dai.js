import { PrivateService } from '@makerdao/services-core';
import contracts from '../contracts/contracts';
import { RAY } from './utils/constants';
import BigNumber from 'bignumber.js';
import abi from 'web3-eth-abi';
import { getCurrency, ETH, USD_PETH, MKR, USD_ETH, USD_MKR } from './Currency';

export default class PriceService extends PrivateService {
  /**
   * @param {string} name
   */

  constructor(name = 'price') {
    super(name, ['token', 'smartContract', 'event']);
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
    return this.get('smartContract').getContract(contract);
  }

  _valueForContract(value, unit) {
    const str = getCurrency(value, unit).toFixed('wei');
    return abi.encodeParameter('uint256', str);
  }

  getWethToPethRatio() {
    return this._getContract(contracts.SAI_TUB)
      .per()
      .then(bn => new BigNumber(bn.toString()).dividedBy(RAY).toNumber());
  }

  async getEthPrice() {
    return USD_ETH.wei(await this._getContract(contracts.SAI_PIP).read());
  }

  async getPethPrice() {
    return USD_PETH.ray(
      (await this._getContract(contracts.SAI_TUB).tag())._hex
    );
  }

  async getMkrPrice() {
    return USD_MKR.wei((await this._getContract(contracts.SAI_PEP).peek())[0]);
  }

  setEthPrice(newPrice, { unit = ETH, promise } = {}) {
    const value = this._valueForContract(newPrice, unit);
    return this._getContract(contracts.SAI_PIP).poke(value, { promise });
  }

  setMkrPrice(newPrice, { unit = MKR, promise } = {}) {
    const value = this._valueForContract(newPrice, unit);
    return this._getContract(contracts.SAI_PEP).poke(value, { promise });
  }
}
