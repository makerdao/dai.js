import PrivateService from '../core/PrivateService';
import SmartContractService from './SmartContractService';
import EthereumTokenService from './EthereumTokenService';
import TokenConversionService from './TokenConversionService';
import contracts from '../../contracts/contracts';
import Cdp from './Cdp';
import tokens from '../../contracts/tokens';
import TransactionManager from './TransactionManager';
import AllowanceService from './AllowanceService';
import PriceFeedService from './PriceFeedService';
import { utils } from 'ethers';
import BigNumber from 'bignumber.js';
import { WAD, RAY } from '../utils/constants';

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
    const allowanceService = AllowanceService.buildTestServiceMaxAllowance();
    const priceFeed = PriceFeedService.buildTestService();

    service
      .manager()
      .inject('smartContract', smartContract)
      .inject('token', tokenService)
      .inject('conversionService', conversionService)
      .inject('transactionManager', transactionManager)
      .inject('allowance', allowanceService)
      .inject('priceFeed', priceFeed);

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
      'transactionManager',
      'allowance',
      'priceFeed'
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

    return Promise.all([
      this.get('allowance').requireAllowance(
        tokens.MKR,
        this._tubContract().getAddress()
      ),
      this.get('allowance').requireAllowance(
        tokens.DAI,
        this._tubContract().getAddress()
      )
    ]).then(() => {
      return this._transactionManager().createTransactionHybrid(
        this._tubContract().shut(hexCdpId, { gasLimit: 4000000 })
      );
    });
  }

  lockEth(cdpId, eth) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = utils.parseUnits(eth, 18);

    return Promise.all([
      this._conversionService().convertEthToPeth(eth),
      this.get('allowance').requireAllowance(
        tokens.PETH,
        this._tubContract().getAddress()
      )
    ]).then(() => {
      return this._transactionManager().createTransactionHybrid(
        this._tubContract().lock(hexCdpId, parsedAmount)
      );
    });
  }

  lockWeth(cdpId, weth) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = utils.parseUnits(weth, 18);

    return Promise.all([
      this._conversionService().convertWethToPeth(weth),
      this.get('allowance').requireAllowance(
        tokens.PETH,
        this._tubContract().getAddress()
      )
    ]).then(() => {
      return this._transactionManager().createTransactionHybrid(
        this._tubContract().lock(hexCdpId, parsedAmount)
      );
    });
  }

  freePeth(cdpId, amount) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = utils.parseUnits(amount, 18);

    return this._transactionManager().createTransactionHybrid(
      this._tubContract().free(hexCdpId, parsedAmount, { gasLimit: 200000 })
    );
  }

  getCdpInfo(cdpId) {
    const hexCdpId = this._smartContract().numberToBytes32(cdpId);
    return this._tubContract().cups(hexCdpId);
  }

  getCdpCollateral(cdpId) {
    const hexCdpId = this._smartContract().numberToBytes32(cdpId);
    return this._tubContract()
      .ink(hexCdpId)
      .then(bn => new BigNumber(bn.toString()).dividedBy(WAD).toNumber());
  }

  getCdpDebt(cdpId) {
    const hexCdpId = this._smartContract().numberToBytes32(cdpId);
    // we need to use the Web3.js contract interface to get the return value
    // from the non-constant function `tab`
    const tub = this._smartContract().getWeb3ContractByName(contracts.SAI_TUB);
    return new Promise((resolve, reject) =>
      tub.tab.call(hexCdpId, (err, val) => (err ? reject(err) : resolve(val)))
    ).then(bn => new BigNumber(bn.toString()).dividedBy(WAD).toNumber());
  }

  getCollateralizationRatio(cdpId) {
    return this.getCdpCollateral(cdpId).then(pethCollateral =>
      this.getCdpDebt(cdpId).then(daiDebt =>
        this.get('priceFeed')
          .getEthPrice()
          .then(ethPrice =>
            this.get('conversionService')
              .getEthPerPeth()
              .then(
                ethPerPeth => pethCollateral * ethPerPeth * ethPrice / daiDebt
              )
          )
      )
    );
  }

  getLiquidationRatio() {
    return this._tubContract()
      .mat()
      .then(bn => new BigNumber(bn.toString()).dividedBy(RAY).toNumber());
  }

  getLiquidationPrice(cdpId) {
    return this.getLiquidationRatio().then(ratio =>
      this.getCdpDebt(cdpId).then(daiDebt =>
        this.getCdpCollateral(cdpId).then(pethCollateral =>
          this.get('conversionService')
            .getEthPerPeth()
            .then(ethPerPeth => ratio * daiDebt / pethCollateral * ethPerPeth)
        )
      )
    );
  }

  drawDai(cdpId, amount) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = utils.parseUnits(amount.toString(), 18);

    return this._transactionManager().createTransactionHybrid(
      this._tubContract().draw(hexCdpId, parsedAmount, { gasLimit: 4000000 })
    );
  }

  wipeDai(cdpId, amount) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = utils.parseUnits(amount.toString(), 18);

    return Promise.all([
      this.get('allowance').requireAllowance(
        tokens.MKR,
        this._tubContract().getAddress()
      ),
      this.get('allowance').requireAllowance(
        tokens.DAI,
        this._tubContract().getAddress()
      )
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

  give(cdpId, newAddress) {
    const hexCdpId = this._hexCdpId(cdpId);

    return this._transactionManager().createTransactionHybrid(
      this._tubContract().give(hexCdpId, newAddress)
    );
  }

  bite(cdpId) {
    const hexCdpId = this._hexCdpId(cdpId);

    return this._transactionManager().createTransactionHybrid(
      this._tubContract().bite(hexCdpId, { gasLimit: 4000000 })
    );
  }
}
