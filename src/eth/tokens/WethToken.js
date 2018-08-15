import Erc20Token from './Erc20Token';
import { ETH } from '../Currency';

export default class WethToken extends Erc20Token {
  constructor(contract, web3Service, decimals) {
    super(contract, web3Service, decimals, 'WETH');
  }

  name() {
    return this._contract.name();
  }

  deposit(amount, unit = ETH) {
    console.log('got inside deposit');
    return this._contract.deposit(this._valueForContract(amount, unit), {
      gasPrice: 12000000000,
      gasLimit: 4000000
    });
  }

  withdraw(amount, unit = ETH) {
    return this._contract.withdraw(this._valueForContract(amount, unit), {
      gasPrice: 12000000000,
      gasLimit: 4000000
    });
  }
}
