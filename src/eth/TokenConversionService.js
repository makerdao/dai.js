import PrivateService from '../core/PrivateService';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';

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

  convertEthToWeth(eth) {
    const wethToken = this._getToken(tokens.WETH);

    return wethToken.deposit(eth);
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
