import PrivateService from '../core/PrivateService';
import contracts from '../../contracts/contracts';
import { RAY } from '../utils/constants';
import BigNumber from 'bignumber.js';
import { utils } from 'ethers';
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
    return this.get('smartContract').getContractByName(contract);
  }

  _valueForContract(value, unit) {
    const bn = getCurrency(value, unit).toEthersBigNumber('wei');
    return utils.hexlify(utils.padZeros(bn, 32));
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
    return USD_PETH.ray(await this._getContract(contracts.SAI_TUB).tag());
  }

  async getMkrPrice() {
    return USD_MKR.wei((await this._getContract(contracts.SAI_PEP).peek())[0]);
  }

  setEthPrice(newPrice, unit = ETH) {
    const value = this._valueForContract(newPrice, unit);
    return this._getContract(contracts.SAI_PIP).poke(value);
  }

  setMkrPrice(newPrice, unit = MKR) {
    const value = this._valueForContract(newPrice, unit);
    return this._getContract(contracts.SAI_PEP).poke(value);
  }
}
