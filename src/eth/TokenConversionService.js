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

  async convertEthToWeth(amount, unit = ETH) {
    console.log('got inside EthToWeth');
    const value = getCurrency(amount, unit);
    const txHybrid = await this._getToken(WETH).deposit(value);
    console.log('tx back in ethtoweth:', txHybrid);
    return txHybrid;
  }

  async convertWethToPeth(amount, unit = WETH) {
    const pethToken = this._getToken(PETH);
    console.log('got inside WethToPeth');
    await this.get('allowance').requireAllowance(
      WETH,
      await this.get('smartContract')
        .getContractByName(contracts.SAI_TUB)
        .getAddress()
    );
    const txHybrid = await pethToken.join(amount, unit);

    console.log('txHybrid about to return in wethToPeth:', txHybrid);
    return txHybrid;
  }

  async convertEthToPeth(value) {
    await this.convertEthToWeth(value);
    return await this.convertWethToPeth(value);
  }
}
