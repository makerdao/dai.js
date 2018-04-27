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

    return Promise.all([
      this._conversionService()
        .approveToken(dai)
        .then(txn => txn.onPending()),
      this._conversionService()
        .approveToken(peth)
        .then(txn => txn.onPending())
    ]).then(() => {
      return new TransactionObject(
        this._tubContract().shut(hexCdpId),
        this._ethersProvider(),
        cdpId
      );
    });
  }

  lockEth(cdpId, eth) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = this._parseDenomination(eth);

    return this._conversionService()
      .convertEthToPeth(eth)
      .then(txn => {
        txn.onMined();
        return new TransactionObject(
          this._tubContract().lock(hexCdpId, parsedAmount),
          this._ethersProvider()
        );
      });
  }

  freePeth(cdpId, amount) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = this._parseDenomination(amount);
    const peth = this.get('token').getToken(tokens.PETH);

    return new Promise((resolve, reject) => {
      this._conversionService()
        .approveToken(peth)
        .onMined()
        .then(() => {
          console.log('got here');
          // resolve(peth.exit(amount));
        });
    });

    // return new TransactionObject(
    //   this._tubContract().free(hexCdpId, parsedAmount),
    //   this._ethersProvider()
    // );
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
