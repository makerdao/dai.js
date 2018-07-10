import Erc20Token from './Erc20Token';
import { ETH } from '../Currency';

export default class WethToken extends Erc20Token {
  constructor(contract, web3Service, decimals, transactionManager) {
    super(contract, web3Service, decimals, transactionManager, 'WETH');
  }

  name() {
    return this._contract.name();
  }

  deposit(amount, unit = ETH) {
    return this._transactionManager.createTransactionHybrid(
      this._contract.deposit({
        value: this._valueForContract(amount, unit)
      })
    );
  }

  withdraw(amount, unit = ETH) {
    return this._transactionManager.createTransactionHybrid(
      this._contract.withdraw(this._valueForContract(amount, unit))
    );
  }
}
