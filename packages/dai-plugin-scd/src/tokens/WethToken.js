import Erc20Token from './Erc20Token';
import { ETH, WETH } from '../Currency';

export default class WethToken extends Erc20Token {
  constructor(contract, web3Service, decimals) {
    super(contract, web3Service, decimals, 'WETH');
  }

  name() {
    return this._contract.name();
  }

  deposit(amount, { unit = ETH, ...options } = {}) {
    return this._contract.deposit({
      value: this._valueForContract(amount, unit),
      ...options
    });
  }

  withdraw(amount, { unit = WETH, ...options } = {}) {
    const value = this._valueForContract(amount, unit);
    return this._contract.withdraw(value, options);
  }
}
