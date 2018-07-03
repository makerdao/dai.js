import PrivateService from '../core/PrivateService';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';
import { getCurrency, ETH } from './CurrencyUnits';

export default class TokenConversionService extends PrivateService {
  /**
   * @param {string} name
   */
  constructor(name = 'conversionService') {
    super(name, ['smartContract', 'token', 'allowance']);
  }

  _getToken(token) {
    return this.get('token').getToken(token);
  }

  convertEthToWeth(amount, unit = ETH) {
    return this._getToken(tokens.WETH).deposit(getCurrency(amount, unit));
  }

  convertWethToPeth(weth) {
    const pethToken = this._getToken(tokens.PETH);

    return this.get('allowance')
      .requireAllowance(
        tokens.WETH,
        this.get('smartContract')
          .getContractByName(contracts.SAI_TUB)
          .getAddress()
      )
      .then(() => pethToken.join(weth));
  }

  convertEthToPeth(value) {
    return this.convertEthToWeth(value).then(() =>
      this.convertWethToPeth(value)
    );
  }
}
