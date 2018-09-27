import PrivateService from '../core/PrivateService';
import contracts from '../../contracts/contracts';
import { PETH, WETH } from './Currency';
import tracksTransactions from '../utils/tracksTransactions';

export default class TokenConversionService extends PrivateService {
  constructor(name = 'conversion') {
    super(name, ['smartContract', 'token', 'allowance']);
  }

  _getToken(token) {
    return this.get('token').getToken(token);
  }

  convertEthToWeth(amount, options) {
    return this._getToken(WETH).deposit(amount, options);
  }

  @tracksTransactions
  async convertWethToPeth(amount, { unit = WETH, promise } = {}) {
    const pethContract = this._getToken(PETH);

    await this.get('allowance').requireAllowance(
      WETH,
      this.get('smartContract').getContractByName(contracts.SAI_TUB).address,
      { promise }
    );
    return pethContract.join(amount, { unit, promise });
  }

  async convertEthToPeth(value) {
    await this.convertEthToWeth(value);
    return this.convertWethToPeth(value);
  }
}
