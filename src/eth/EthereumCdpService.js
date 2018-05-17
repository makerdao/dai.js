import PrivateService from '../core/PrivateService';
import SmartContractService from './SmartContractService';
import EthereumTokenService from './EthereumTokenService';
import TokenConversionService from './TokenConversionService';
import contracts from '../../contracts/contracts';
import Cdp from './Cdp';
import tokens from '../../contracts/tokens';
import TransactionManager from './TransactionManager';

import { utils } from 'ethers';

export default class EthereumCdpService extends PrivateService {
  static buildTestService(suppressOutput = true) {
    const service = new EthereumCdpService();
    const smartContract = SmartContractService.buildTestService(
      null,
      suppressOutput
    );
    const transactionManager = TransactionManager.buildTestService(
      smartContract.get('web3')
    );
    const tokenService = EthereumTokenService.buildTestService(
      smartContract,
      transactionManager
    );
    const conversionService = TokenConversionService.buildTestService(
      smartContract,
      tokenService
    );

    service
      .manager()
      .inject('smartContract', smartContract)
      .inject('token', tokenService)
      .inject('conversionService', conversionService)
      .inject('transactionManager', transactionManager);

    return service;
  }

  /**
   * @param {string} name
   */
  constructor(name = 'cdp') {
    super(name, [
      'smartContract',
      'token',
      'conversionService',
      'transactionManager'
    ]);
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

  _transactionManager() {
    return this.get('transactionManager');
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
    const dai = this.get('token').getToken(tokens.DAI);
    const peth = this.get('token').getToken(tokens.PETH);
    const weth = this.get('token').getToken(tokens.WETH);

    return Promise.all([
      this._conversionService().approveToken(dai),
      this._conversionService().approveToken(peth),
      this._conversionService().approveToken(weth)
    ]).then(() => {
      return this._transactionManager().createTransactionHybrid(
        this._tubContract().shut(hexCdpId, { gasLimit: 4000000 })
      );
    });
  }

  lockEth(cdpId, eth) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = utils.parseUnits(eth, 18);

    return this._conversionService()
      .convertEthToPeth(eth)
      .then(() => {
        return this._transactionManager().createTransactionHybrid(
          this._tubContract().lock(hexCdpId, parsedAmount)
        );
      });
  }

  freePeth(cdpId, amount) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = utils.parseUnits(amount, 18);
    const weth = this.get('token').getToken(tokens.WETH);
    const peth = this.get('token').getToken(tokens.PETH);

    return Promise.all([
      this._conversionService().approveToken(weth),
      this._conversionService().approveToken(peth)
    ]).then(() => {
      return this._transactionManager().createTransactionHybrid(
        this._tubContract().free(hexCdpId, parsedAmount, { gasLimit: 200000 })
      );
    });
  }

  getCdpInfo(cdpId) {
    const hexCdpId = this._smartContract().numberToBytes32(cdpId);

    return this._tubContract().cups(hexCdpId);
  }

  drawDai(cdpId, amount) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = utils.parseUnits(amount.toString(), 18);
    const dai = this.get('token').getToken(tokens.DAI);
    const peth = this.get('token').getToken(tokens.PETH);

    return Promise.all([
      this._conversionService().approveToken(peth),
      this._conversionService().approveToken(dai)
    ]).then(() => {
      return this._transactionManager().createTransactionHybrid(
        this._tubContract().draw(hexCdpId, parsedAmount, { gasLimit: 4000000 })
      );
    });
  }

  wipeDai(cdpId, amount) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = utils.parseUnits(amount.toString(), 18);
    const dai = this.get('token').getToken(tokens.DAI);
    const peth = this.get('token').getToken(tokens.PETH);

    return Promise.all([
      this._conversionService().approveToken(peth),
      this._conversionService().approveToken(dai)
    ]).then(() => {
      return this._transactionManager().createTransactionHybrid(
        this._tubContract().wipe(hexCdpId, parsedAmount, { gasLimit: 4000000 })
      );
    });
  }

  abstractedCollateralPrice() {
    const token = this.get('token').getToken(tokens.PETH);

    return this._tubContract()
      .tag()
      .then(value => parseFloat(token.toUserFormat(value)));
  }

  safe(cdpId) {
    const hexCdpId = this._hexCdpId(cdpId);

    return this._tubContract().safe(hexCdpId);
  }
}
