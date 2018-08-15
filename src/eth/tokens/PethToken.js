import Erc20Token from './Erc20Token';
import { WETH } from '../Currency';

export default class PethToken extends Erc20Token {
  constructor(contract, web3Service, tub) {
    super(contract, web3Service, 18, 'PETH');
    this._tub = tub;
  }

  join(amount, unit = WETH) {
    console.log('got inside join');
    return this._tub.join(this._valueForContract(amount, unit), {
      gasLimit: 200000,
      gasPrice: 12000000000
    });
  }

  exit(amount, unit = WETH) {
    return this._tub.exit(this._valueForContract(amount, unit), {
      gasLimit: 100000,
      gasPrice: 12000000000
    });
  }

  async wrapperRatio() {
    return WETH.ray(await this._tub.per());
  }

  async joinPrice(amount, unit = WETH) {
    const value = this._valueForContract(amount, unit);
    return WETH.wei(await this._tub.ask(value));
  }

  async exitPrice(amount, unit = WETH) {
    const value = this._valueForContract(amount, unit);
    return WETH.wei(await this._tub.bid(value));
  }
}
