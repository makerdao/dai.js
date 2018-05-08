import PrivateService from '../core/PrivateService';
import SmartContractService from './SmartContractService';
import EthereumTokenService from './EthereumTokenService';
import TokenConversionService from './TokenConversionService';
import contracts from '../../contracts/contracts';
import TransactionObject from './TransactionObject';
import Cdp from './Cdp';
import tokens from '../../contracts/tokens';

import { utils } from 'ethers';

export default class EthereumCdpService extends PrivateService {
  static buildTestService() {
    const service = new EthereumCdpService();
    const smartContract = SmartContractService.buildTestService();
    const tokenService = EthereumTokenService.buildTestService(smartContract);
    const conversionService = TokenConversionService.buildTestService(smartContract);

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
    return this._smartContract().getContractByName(contracts.SAI_TUB);
  }

  _web3Service() {
    return this._smartContract().get('web3');
  }

  _conversionService() {
    return this.get('conversionService');
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
        .then(txn => txn.onMined()),
      this._conversionService()
        .approveToken(peth)
        .then(txn => txn.onMined())
    ]).then(() => {
      return new TransactionObject(
        this._tubContract().shut(hexCdpId),
        this._web3Service(),
        cdpId
      );
    });
  }

  lockEth(cdpId, eth) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = utils.parseUnits(eth, 18);

    return this._conversionService()
      .convertEthToPeth(eth)
      .then(txn => {
        txn.onMined();
        return new TransactionObject(
          this._tubContract().lock(hexCdpId, parsedAmount),
          this._web3Service()
        );
      });
  }

  freePeth(cdpId, amount) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = utils.parseUnits(amount, 18);
    const weth = this.get('token').getToken(tokens.WETH);
    const peth = this.get('token').getToken(tokens.PETH);

    return Promise.all([
      this._conversionService()
        .approveToken(weth)
        .then(txn => txn.onMined()),
      this._conversionService()
        .approveToken(peth)
        .then(txn => txn.onMined())
    ]).then(() => {
      return new TransactionObject(
        this._tubContract().free(hexCdpId, parsedAmount, { gasLimit: 200000 }),
        this._web3Service()
      );
    });
  }

  getCdpInfo(cdpId) {
    const hexCdpId = this._smartContract().numberToBytes32(cdpId);

    return this._tubContract().cups(hexCdpId);
  }

  // drawDai(cdpId, amount) {
  //   const hexCdpId = this._hexCdpId(cdpId);
  //   const parsedAmount = utils.parseUnits(amount, 18);

  //   //cdp must have peth locked inside it
  //   return this._tubContract()
  //     .draw(hexCdpId, parsedAmount)
  //     .then(transaction =>
  //       this._ethersProvider().waitForTransaction(transaction.hash)
  //     )
  //     .then(() => {
  //       // eslint-disable-next-line
  //       this.getCdpInfo(cdpId).then(result => console.log(result));
  //     });
  // }
}
