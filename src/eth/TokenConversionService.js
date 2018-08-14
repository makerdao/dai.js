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

  async convertEthToPeth(value) {
    await this.convertEthToWeth(value);
    return this.convertWethToPeth(value);
  }
}
