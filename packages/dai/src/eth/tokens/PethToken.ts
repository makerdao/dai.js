import Erc20Token from './Erc20Token';
import { WETH, PETH } from '../Currency';

// TODO: this file needs to be deprecated in favor of the dai-plugin-scd one
export default class PethToken extends Erc20Token {
  constructor(contract, web3Service, tub) {
    super(contract, web3Service, 18, 'PETH');
    this._tub = tub;
  }

  join(amount, { unit = WETH, promise } = {}) {
    const value = this._valueForContract(amount, unit);
    return this._tub.join(value, { promise });
  }

  exit(amount, { unit = PETH, promise } = {}) {
    const value = this._valueForContract(amount, unit);
    return this._tub.exit(value, { promise });
  }

  async wrapperRatio() {
    return WETH.ray((await this._tub.per())._hex);
  }

  async joinPrice(amount, unit = WETH) {
    const value = this._valueForContract(amount, unit);
    return WETH.wei((await this._tub.ask(value))._hex);
  }

  async exitPrice(amount, unit = WETH) {
    const value = this._valueForContract(amount, unit);
    return WETH.wei((await this._tub.bid(value))._hex);
  }
}
