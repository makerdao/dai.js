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
  constructor(name = 'tokenConversionService') {
    super(name, ['smartContract', 'token']);
  }

  _parseDenomination(value) {
    const contract = this.get('smartContract');
    const ethersUtils = contract.get('web3').ethersUtils();

    return ethersUtils.parseEther(value);
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

  _approveToken(token) {
    return token.approveUnlimited(this._tubContract().address);
  }

  convertEthToWeth(eth) {
    const parsedAmount = this._parseDenomination(eth);
    const wethToken = this._getToken(tokens.WETH);

    return this._approveToken(wethToken)
      .onPending()
      .then(() => wethToken.deposit(parsedAmount, this._ethersProvider()));
  }

  convertWethToPeth(weth) {
    const parsedAmount = this._parseDenomination(weth);
    const pethToken = this._getToken(tokens.PETH);

    return this._approveToken(pethToken)
      .onPending()
      .then(() => pethToken.join(parsedAmount));
  }

  // prettier-ignore
  convertEthToPeth(eth) {
    const parsedAmount = this._parseDenomination(eth);
    const wethToken = this._getToken(tokens.WETH);
    const pethToken = this._getToken(tokens.PETH);

    return this._approveToken(wethToken).onPending()
      this._approveToken(pethToken).onPending()
      this.convertEthToWeth(parsedAmount).onMined()
      this.convertWethToPeth(parsedAmount);
  }
}
