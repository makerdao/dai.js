import PrivateService from '../core/PrivateService';
import EthereumTokenService from './EthereumTokenService';
import SmartContractService from './SmartContractService';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';

export default class TokenConversionService extends PrivateService {
  static buildTestService(smartContract = null, token = null) {
    const service = new TokenConversionService();
    const smartContractService = smartContract || SmartContractService.buildTestService();
    const tokenService = token || EthereumTokenService.buildTestService(smartContract);

    service
      .manager()
      .inject('smartContract', smartContractService)
      .inject('token', tokenService);

    return service;
  }

  /**
   * @param {string} name
   */
  constructor(name = 'conversionService') {
    super(name, ['smartContract', 'token']);
  }

  _getToken(token) {
    return this.get('token').getToken(token);
  }

  approveToken(token) {
    const tubContract = this.get('smartContract').getContractByName(
      contracts.SAI_TUB
    );

    return new Promise((resolve, reject) => {
      try {
        resolve(token.approveUnlimited(tubContract.getAddress()));
      } catch (err) {
        reject(err.message);
      }
    });
  }

  convertEthToWeth(eth) {
    const wethToken = this._getToken(tokens.WETH);

    return this.approveToken(wethToken).then(() => wethToken.deposit(eth));
  }

  convertWethToPeth(weth) {
    const pethToken = this._getToken(tokens.PETH);

    return this.approveToken(pethToken).then(() => pethToken.join(weth));
  }

  convertEthToPeth(value) {
    return this.convertEthToWeth(value).then(() =>
      this.convertWethToPeth(value)
    );
  }
}
