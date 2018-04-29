import PrivateService from '../core/PrivateService';
import EthereumTokenService from './EthereumTokenService';
import SmartContractService from './SmartContractService';
import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';

export default class TokenConversionService extends PrivateService {
  static buildTestService() {
    const service = new TokenConversionService();
    const tokenService = EthereumTokenService.buildTestService();
    const smartContract = SmartContractService.buildTestService();

    service
      .manager()
      .inject('smartContract', smartContract)
      .inject('token', tokenService);

    return service;
  }

  /**
   * @param {string} name
   */
  constructor(name = 'conversionService') {
    super(name, ['smartContract', 'token']);
  }

  _smartContract() {
    return this.get('smartContract');
  }

  _tubContract() {
    return this._smartContract().getContractByName(contracts.TUB);
  }

  _ethersProvider() {
    return this._smartContract()
      .get('web3')
      .ethersProvider();
  }

  _getToken(token) {
    return this.get('token').getToken(token);
  }

  approveToken(token) {
    return new Promise((resolve, reject) => {
      try {
        resolve(token.approveUnlimited(this._tubContract().address));
      } catch (err) {
        reject(err.message);
      }
    });
  }

  convertEthToWeth(eth) {
    const wethToken = this._getToken(tokens.WETH);

    return this.approveToken(wethToken)
      .then(txn => txn.onPending())
      .then(() => wethToken.deposit(eth));
  }

  convertWethToPeth(weth) {
    const pethToken = this._getToken(tokens.PETH);

    return this.approveToken(pethToken)
      .then(txn => txn.onPending())
      .then(() => pethToken.join(weth));
  }

  convertEthToPeth(value) {
    return this.convertEthToWeth(value)
      .then(txn => txn.onMined())
      .then(() => this.convertWethToPeth(value));
  }
}
