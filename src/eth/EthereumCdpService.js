import PrivateService from '../core/PrivateService';
import contracts from '../../contracts/contracts';
import Cdp from './Cdp';
import tokens from '../../contracts/tokens';
import { utils } from 'ethers';
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

  async lockEth(cdpId, eth) {
    await this._conversionService().convertEthToWeth(eth);
    return this.lockWeth(cdpId, eth);
  }

  async lockWeth(cdpId, weth) {
    const wethperPeth = await this.getWethToPethRatio();
    const peth = new BigNumber(weth)
      .div(wethperPeth.toString())
      .round(18)
      .toString();

    await this._conversionService().convertWethToPeth(weth);
    return this.lockPeth(cdpId, peth);
  }

  async lockPeth(cdpId, peth) {
    const hexCdpId = this._hexCdpId(cdpId);
    const parsedAmount = utils.parseUnits(peth, 18);

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
    const parsedAmount = utils.parseUnits(amount, 18);

    return this._transactionManager().createTransactionHybrid(
      this._tubContract().free(hexCdpId, parsedAmount, { gasLimit: 200000 })
    );
  }

  getCdpInfo(cdpId) {
    const hexCdpId = this._smartContract().numberToBytes32(cdpId);
    return this._tubContract().cups(hexCdpId);
  }

  getCdpCollateralInPeth(cdpId) {
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

  async getCollateralizationRatio(cdpId) {
    const [daiDebt, pethPrice, pethCollateral] = await Promise.all([
      this.getCdpDebt(cdpId),
      this.getPethPriceInUSD(),
      this.getCdpCollateralInPeth(cdpId)
    ]);
    return pethCollateral * pethPrice / daiDebt;
  }

  getLiquidationRatio() {
    return this._tubContract()
      .mat()
      .then(bn => new BigNumber(bn.toString()).dividedBy(RAY).toNumber());
  }

  getLiquidationPenalty() {
    return this._tubContract()
      .axe()
      .then(bn =>
        new BigNumber(bn.toString())
          .dividedBy(RAY)
          .minus(1)
          .toNumber()
      );
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
      this.getCdpDebt(cdpId),
      this.getTargetPrice(),
      this.getLiquidationRatio(),
      this.getCdpCollateralInPeth(cdpId)
    ]).then(vals => {
      const debt = vals[0];
      const targetPrice = vals[1];
      const liqRatio = vals[2];
      const collateral = vals[3];
      const price = debt * targetPrice * liqRatio / collateral;
      return price;
    });
  }

  getLiquidationPriceEthUSD(cdpId) {
    return Promise.all([
      this._getLiquidationPricePethUSD(cdpId),
      this.getWethToPethRatio()
    ]).then(vals => {
      return vals[0] / vals[1];
    });
  }

  isCdpSafe(cdpId) {
    return Promise.all([
      this.getLiquidationPriceEthUSD(cdpId),
      this.get('priceFeed').getEthPrice()
    ]).then(vals => {
      const liqPrice = vals[0];
      const ethPrice = vals[1];
      return parseFloat(ethPrice) >= liqPrice;
    });
  }

  getGovernanceFee() {
    return this._tubContract()
      .fee()
      .then(bn => new BigNumber(bn.toString()).dividedBy(RAY).toNumber());
  }

  getWethToPethRatio() {
    return this._tubContract()
      .per()
      .then(bn => new BigNumber(bn.toString()).dividedBy(RAY).toNumber());
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

  getPethPriceInUSD() {
    return this._tubContract()
      .tag()
      .then(value =>
        BigNumber(value)
          .dividedBy(RAY)
          .toNumber()
      );
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
