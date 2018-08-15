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
    const txHybrid = this._contract.deposit({
      value: this._valueForContract(amount, unit),
      gasPrice: 20000000000,
      gasLimit: 4000000
    });
    console.log('txHybrid about to return in deposit:', txHybrid);
    return txHybrid;
  }

  withdraw(amount, unit = ETH) {
    return this._contract.withdraw(this._valueForContract(amount, unit));
  }
}
