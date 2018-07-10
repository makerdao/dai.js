import PrivateService from '../core/PrivateService';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';
import { getCurrency, ETH, WETH } from './Currency';

export default class TokenConversionService extends PrivateService {
  constructor(name = 'conversion') {
    super(name, ['smartContract', 'token', 'allowance']);
  }

  _getToken(token) {
    return this.get('token').getToken(token);
  }

  convertEthToWeth(amount, unit = ETH) {
    return this._getToken(tokens.WETH).deposit(getCurrency(amount, unit));
  }

  async convertWethToPeth(amount, unit = WETH) {
    const pethToken = this._getToken(tokens.PETH);

    await this.get('allowance').requireAllowance(
      tokens.WETH,
      this.get('smartContract')
        .getContractByName(contracts.SAI_TUB)
        .getAddress()
    );
    return pethToken.join(amount, unit);
  }

  async convertEthToPeth(value) {
    await this.convertEthToWeth(value);
    return this.convertWethToPeth(value);
  }
}
