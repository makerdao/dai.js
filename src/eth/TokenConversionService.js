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
    return token.approveUnlimited(this._tubContract().address);
  }

  convertEthToWeth(eth) {
    const wethToken = this._getToken(tokens.WETH);

    return this.approveToken(wethToken)
      .onPending()
      .then(() => wethToken.deposit(eth), this._ethersProvider());
  }

  convertWethToPeth(weth) {
    const pethToken = this._getToken(tokens.PETH);

    return this.approveToken(pethToken)
      .onPending()
      .then(() => pethToken.join(weth));
  }

  convertEthToPeth(value) {
    const wethToken = this._getToken(tokens.WETH);
    const pethToken = this._getToken(tokens.PETH);

    this.approveToken(wethToken).onPending();
    this.approveToken(pethToken).onPending();
    this.convertEthToWeth(value).then(txn => txn.onMined());

    return this.convertWethToPeth(value);
  }
}
