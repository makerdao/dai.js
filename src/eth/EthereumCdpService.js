import PrivateService from '../core/PrivateService';
import SmartContractService from './SmartContractService';
import EthereumTokenService from './EthereumTokenService';
import TokenConversionService from './TokenConversionService';
import contracts from '../../contracts/contracts';
import TransactionObject from './TransactionObject';
import Cdp from './Cdp';
import tokens from '../../contracts/tokens';

export default class EthereumCdpService extends PrivateService {
  static buildTestService() {
    const service = new EthereumCdpService();
    const tokenService = EthereumTokenService.buildTestService();
    const smartContract = SmartContractService.buildTestService();
    const conversionService = TokenConversionService.buildTestService();

    service
      .manager()
      .inject('smartContract', smartContract)
      .inject('token', tokenService)
      .inject('conversionService', conversionService);

    return service;
  }

  /**
   * @param {string} name
   */
  constructor(name = 'cdp') {
    super(name, ['smartContract', 'token', 'conversionService']);
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

  _conversionService() {
    return this.get('conversionService');
  }

  _parseDenomination(amount) {
    return this._smartContract()
      .get('web3')
      .ethersUtils()
      .parseEther(amount);
  }

  _hexCdpId(cdpId) {
    return this._smartContract().numberToBytes32(cdpId);
  }

  openCdp() {
    return new Cdp(this).transactionObject();
  }

  shutCdp(cdpId) {
    const hexCdpId = this._hexCdpId(cdpId);
    const peth = this.get('token').getToken(tokens.PETH);
    const dai = this.get('token').getToken(tokens.DAI);

    this._conversionService()
      .approveToken(dai)
      .onPending();

    this._conversionService()
      .approveToken(peth)
      .onPending();

    return this._tubContract().shut(hexCdpId);
  }

  lockEth(cdpId, eth) {
    const parsedAmount = this._parseDenomination(eth);
    const hexCdpId = this._hexCdpId(cdpId);

    return this._conversionService()
      .convertEthToPeth(eth)
      .then(() => {
        return new TransactionObject(
          this._tubContract().lock(hexCdpId, parsedAmount),
          this._ethersProvider()
        );
      });
  }

  drawDai(cdpId, amount) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = this._parseDenomination(amount);

    //cdp must have peth locked inside it
    return this._tubContract()
      .draw(hexCdpId, parsedAmount)
      .then(transaction =>
        this._ethersProvider().waitForTransaction(transaction.hash)
      )
      .then(() => {
        // eslint-disable-next-line
        this.getCdpInfo(cdpId).then(result => console.log(result));
      });
  }

  getCdpInfo(cdpId) {
    const hexCdpId = this._smartContract().numberToBytes32(cdpId);

    return this._tubContract().cups(hexCdpId);
  }
}
