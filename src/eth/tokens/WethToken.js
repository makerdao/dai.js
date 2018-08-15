import Erc20Token from './Erc20Token';
import { ETH } from '../Currency';

export default class WethToken extends Erc20Token {
  constructor(contract, web3Service, decimals, transactionManager) {
    super(contract, web3Service, decimals, transactionManager, 'WETH');
  }

  name() {
    return this._contract.name();
  }

  async deposit(amount, unit = ETH) {
    console.log('got inside deposit');
    const value = this._valueForContract(amount, unit);

    const txHybrid = this._transactionManager.createTransactionHybrid(
      this._contract.deposit({
        value: value,
        gasPrice: 20000000000,
        gasLimit: 4000000
      })
    );
    console.log('hybrid back in deposit:', txHybrid);
    return txHybrid;
  }

  withdraw(amount, unit = ETH) {
    return this._transactionManager.createTransactionHybrid(
      this._contract.withdraw(this._valueForContract(amount, unit))
    );
  }
}
