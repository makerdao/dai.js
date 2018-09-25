import PrivateService from '../core/PrivateService';
import contracts from '../../contracts/contracts';
import { getCurrency, ETH, PETH, WETH } from './Currency';

export default class TokenConversionService extends PrivateService {
  constructor(name = 'conversion') {
    super(name, ['smartContract', 'token', 'allowance']);
  }

  _getToken(token) {
    return this.get('token').getToken(token);
  }

  convertEthToWeth(amount, unit = ETH) {
    return this._getToken(WETH).deposit(getCurrency(amount, unit));
  }

  async convertWethToPeth(amount, unit = WETH) {
    const pethToken = this._getToken(PETH);

    await this.get('allowance').requireAllowance(
      WETH,
      this.get('smartContract').getContractByName(contracts.SAI_TUB).address
    );
    return pethToken.join(amount, unit);
  }

  async convertEthToPeth(amount) {
    await this.convertEthToWeth(amount);
    return this.convertWethToPeth(amount);
  }

  convertWethToEth(amount, unit = WETH) {
    return this._getToken(WETH).withdraw(getCurrency(amount, unit));
  }

  async convertPethToWeth(amount, unit = WETH) {
    const pethToken = this._getToken(PETH);

    await this.get('allowance').requireAllowance(
      PETH,
      this.get('smartContract').getContractByName(contracts.SAI_TUB).address
    );
    return pethToken.exit(amount, unit);
  }

  async convertPethToEth(amount) {
    await this.convertPethToWeth(amount);
    return this.convertWethToEth(amount);
  }
}
