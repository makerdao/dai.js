import PrivateService from '../core/PrivateService';
import contracts from '../../contracts/contracts';
import Cdp from './Cdp';
import tokens from '../../contracts/tokens';
import Validator from '../utils/Validator';
import BigNumber from 'bignumber.js';
import { WAD, RAY } from '../utils/constants';

export default class EthereumCdpService extends PrivateService {
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
      'price'
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

  async lockEth(cdpId, eth) {
    await this._conversionService().convertEthToWeth(eth);
    return this.lockWeth(cdpId, eth);
  }

  async lockWeth(cdpId, weth) {
    const wethperPeth = await this.get('price').getWethToPethRatio();
    const peth = new BigNumber(weth)
      .div(wethperPeth.toString())
      .round(18)
      .toString();

    await this._conversionService().convertWethToPeth(weth);
    return this.lockPeth(cdpId, peth);
  }

  async lockPeth(cdpId, peth) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = Validator.bigNumberToBN(Validator.parseUnits(peth)); // default is 18 decimals, so parsedAmount is in wei

    await this.get('allowance').requireAllowance(
      tokens.PETH,
      this._tubContract().getAddress()
    );
    return this._transactionManager().createTransactionHybrid(
      this._tubContract().lock(hexCdpId, parsedAmount)
    );
  }

  freePeth(cdpId, amount) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = Validator.bigNumberToBN(Validator.parseUnits(amount)); // default is 18 decimals, so parsedAmount is in wei

    return this._transactionManager().createTransactionHybrid(
      this._tubContract().free(hexCdpId, parsedAmount, { gasLimit: 200000 })
    );
  }

  drawDai(cdpId, amount) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = Validator.bigNumberToBN(Validator.parseUnits(amount)); // default is 18 decimals, so parsedAmount is in wei

    return this._transactionManager().createTransactionHybrid(
      this._tubContract().draw(hexCdpId, parsedAmount, { gasLimit: 4000000 })
    );
  }

  wipeDai(cdpId, amount) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = Validator.bigNumberToBN(Validator.parseUnits(amount)); // default is 18 decimals, so parsedAmount is in wei

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

  getCdpInfo(cdpId) {
    const hexCdpId = this._smartContract().numberToBytes32(cdpId);
    return this._tubContract().cups(hexCdpId);
  }

  async getCdpCollateralInPeth(cdpId) {
    const hexCdpId = this._smartContract().numberToBytes32(cdpId);
    const value = await this._tubContract().ink(hexCdpId);

    return new BigNumber(value.toString()).dividedBy(WAD).toNumber();
  }

  async getCdpCollateralInEth(cdpId) {
    const [pethCollateral, ratio] = await Promise.all([
      this.getCdpCollateralInPeth(cdpId),
      this.get('price').getWethToPethRatio()
    ]);
    return pethCollateral * ratio;
  }

  async getCdpCollateralInUSD(cdpId) {
    const [ethCollateral, ethPrice] = await Promise.all([
      this.getCdpCollateralInEth(cdpId),
      this.get('price').getEthPrice()
    ]);
    return ethCollateral * ethPrice;
  }

  getCdpDebtInDai(cdpId) {
    const hexCdpId = this._smartContract().numberToBytes32(cdpId);
    // we need to use the Web3.js contract interface to get the return value
    // from the non-constant function `tab`
    const tub = this._smartContract().getWeb3ContractByName(contracts.SAI_TUB);
    return new Promise((resolve, reject) =>
      tub.tab.call(hexCdpId, (err, val) => (err ? reject(err) : resolve(val)))
    ).then(bn => new BigNumber(bn.toString()).dividedBy(WAD).toNumber());
  }

  async getCdpDebtInUSD(cdpId) {
    const [daiDebt, tp] = await Promise.all([
      this.getCdpDebtInDai(cdpId),
      this.getTargetPrice()
    ]);
    return daiDebt * tp;
  }

  async getCollateralizationRatio(cdpId) {
    const [daiDebt, pethPrice, pethCollateral] = await Promise.all([
      this.getCdpDebtInUSD(cdpId),
      this.get('price').getPethPrice(),
      this.getCdpCollateralInPeth(cdpId)
    ]);
    return (pethCollateral * pethPrice) / daiDebt;
  }

  async getLiquidationRatio() {
    const value = await this._tubContract().mat();

    return new BigNumber(value.toString()).dividedBy(RAY).toNumber();
  }

  async getLiquidationPenalty() {
    const value = await this._tubContract().axe();

    return new BigNumber(value.toString())
      .dividedBy(RAY)
      .minus(1)
      .toNumber();
  }

  getTargetPrice() {
    // we need to use the Web3.js contract interface to get the return value
    // from the non-constant function `par()`
    const vox = this._smartContract().getWeb3ContractByName(contracts.SAI_VOX);
    return new Promise((resolve, reject) =>
      vox.par.call((err, val) => (err ? reject(err) : resolve(val)))
    ).then(bn => new BigNumber(bn.toString()).dividedBy(RAY).toNumber());
  }

  _getLiquidationPricePethUSD(cdpId) {
    return Promise.all([
      this.getCdpDebtInUSD(cdpId),
      this.getTargetPrice(),
      this.getLiquidationRatio(),
      this.getCdpCollateralInPeth(cdpId)
    ]).then(vals => {
      const debt = vals[0];
      const targetPrice = vals[1];
      const liqRatio = vals[2];
      const collateral = vals[3];
      const price = (debt * targetPrice * liqRatio) / collateral;
      return price;
    });
  }

  getLiquidationPriceEthUSD(cdpId) {
    return Promise.all([
      this._getLiquidationPricePethUSD(cdpId),
      this.get('price').getWethToPethRatio()
    ]).then(vals => {
      return vals[0] / vals[1];
    });
  }

  isCdpSafe(cdpId) {
    return Promise.all([
      this.getLiquidationPriceEthUSD(cdpId),
      this.get('price').getEthPrice()
    ]).then(vals => {
      const liqPrice = vals[0];
      const ethPrice = vals[1];
      return parseFloat(ethPrice) >= liqPrice;
    });
  }

  getAnnualGovernanceFee() {
    return this._tubContract()
      .fee()
      .then(bn => {
        const fee = new BigNumber(bn.toString()).dividedBy(RAY);
        const secondsPerYear = 60 * 60 * 24 * 365;
        BigNumber.config({ POW_PRECISION: 100 });
        return fee
          .pow(secondsPerYear)
          .minus(1)
          .toNumber();
      });
  }

  async getSystemCollateralization() {
    const dai = this.get('token').getToken(tokens.DAI);
    const [
      _totalWethLocked,
      wethPrice,
      daiSupply,
      targetPrice
    ] = await Promise.all([
      this._tubContract().pie(),
      this.get('price').getEthPrice(),
      dai.totalSupply(),
      this.getTargetPrice()
    ]);

    const totalCollateralValue = new BigNumber(_totalWethLocked)
      .div(WAD)
      .times(wethPrice);
    const systemDaiDebt = new BigNumber(daiSupply).times(targetPrice);
    return new BigNumber(totalCollateralValue).div(systemDaiDebt).toNumber();
  }

  async getWethToPethRatio() {
    const value = await this._tubContract().per();

    return new BigNumber(value.toString()).dividedBy(RAY).toNumber();
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
