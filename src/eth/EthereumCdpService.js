import PrivateService from '../core/PrivateService';
import contracts from '../../contracts/contracts';
import Cdp from './Cdp';
import ProxyCdp from './ProxyCdp';
import BigNumber from 'bignumber.js';
import { WAD, RAY } from '../utils/constants';
import {
  getCurrency,
  USD_DAI,
  USD_ETH,
  DAI,
  ETH,
  PETH,
  WETH,
  MKR,
  USD
} from './Currency';
import { numberToBytes32 } from '../utils/conversion';

export default class EthereumCdpService extends PrivateService {
  /**
   * @param {string} name
   */
  constructor(name = 'cdp') {
    super(name, [
      'smartContract',
      'token',
      'conversion',
      'allowance',
      'price',
      'event'
    ]);
  }

  _smartContract() {
    return this.get('smartContract');
  }

  _tubContract() {
    return this._smartContract().getContractByName(contracts.SAI_TUB);
  }

  _saiProxyTubContract() {
    return this._smartContract().getContractByName(contracts.SAI_PROXY);
  }

  _web3Service() {
    return this._smartContract().get('web3');
  }

  _conversionService() {
    return this.get('conversion');
  }

  async _findCdp(id, dsProxyAddress = null) {
    if (typeof id !== 'number') {
      throw new Error('ID must be a number.');
    }
    const info = await this.getInfo(id);
    if (info.lad.toString() === '0x0000000000000000000000000000000000000000') {
      throw new Error("That CDP doesn't exist--try opening a new one.");
    }
    return dsProxyAddress === null
      ? new Cdp(this, id)
      : new ProxyCdp(this, dsProxyAddress, id);
  }

  openCdp() {
    return new Cdp(this);
  }

  openProxyCdp(dsProxyAddress = null) {
    return new ProxyCdp(this, dsProxyAddress);
  }

  getCdp(id, dsProxyAddress = null) {
    return this._findCdp(id, dsProxyAddress);
  }

  shut(cdpId) {
    const hexCdpId = numberToBytes32(cdpId);
    return Promise.all([
      this.get('allowance').requireAllowance(MKR, this._tubContract().address),
      this.get('allowance').requireAllowance(DAI, this._tubContract().address)
    ]).then(() => {
      return this._tubContract().shut(hexCdpId);
    });
  }

  async lockEth(cdpId, amount, unit = ETH) {
    await this._conversionService().convertEthToWeth(amount, unit);
    return this.lockWeth(cdpId, amount);
  }

  async lockWeth(cdpId, amount, unit = WETH) {
    const wethPerPeth = await this.get('price').getWethToPethRatio();
    const weth = getCurrency(amount, unit);
    await this._conversionService().convertWethToPeth(weth);

    return this.lockPeth(cdpId, weth.div(wethPerPeth));
  }

  async lockPeth(cdpId, amount, unit = PETH) {
    const hexCdpId = numberToBytes32(cdpId);
    const value = getCurrency(amount, unit).toEthersBigNumber('wei');
    await this.get('allowance').requireAllowance(
      PETH,
      this._tubContract().address
    );
    return this._tubContract().lock(hexCdpId, value);
  }

  freePeth(cdpId, amount, unit = PETH) {
    const hexCdpId = numberToBytes32(cdpId);
    const value = getCurrency(amount, unit).toEthersBigNumber('wei');
    return this._tubContract().free(hexCdpId, value);
  }

  drawDai(cdpId, amount, unit = DAI) {
    const hexCdpId = numberToBytes32(cdpId);
    const value = getCurrency(amount, unit).toEthersBigNumber('wei');
    return this._tubContract().draw(hexCdpId, value);
  }

  async wipeDai(cdpId, amount, unit = DAI) {
    const hexCdpId = numberToBytes32(cdpId);
    const value = getCurrency(amount, unit).toEthersBigNumber('wei');
    await Promise.all([
      this.get('allowance').requireAllowance(MKR, this._tubContract().address),
      this.get('allowance').requireAllowance(DAI, this._tubContract().address)
    ]);
    return this._tubContract().wipe(hexCdpId, value);
  }

  getInfo(cdpId) {
    const hexCdpId = numberToBytes32(cdpId);
    return this._tubContract().cups(hexCdpId);
  }

  async getCollateralValue(cdpId, unit = ETH) {
    const hexCdpId = numberToBytes32(cdpId);
    const pethValue = PETH.wei(await this._tubContract().ink(hexCdpId));
    if (unit === PETH) return pethValue;

    const pethPrice = await this.get('price').getWethToPethRatio();
    const ethValue = ETH(pethValue.times(pethPrice));

    if (unit === ETH) return ethValue;

    const ethPrice = await this.get('price').getEthPrice();
    const usdValue = ethValue.times(ethPrice);

    if (unit === USD) return usdValue;

    throw new Error(
      `Don't know how to get collateral value in ${unit ? unit.symbol : unit}`
    );
  }

  async getDebtValue(cdpId, unit = DAI) {
    const hexCdpId = numberToBytes32(cdpId);
    // we need to use the Web3.js contract interface to get the return value
    // from the non-constant function `tab`
    const tub = this._smartContract().getWeb3ContractByName(contracts.SAI_TUB);
    const tab = await new Promise((resolve, reject) =>
      tub.tab.call(hexCdpId, (err, val) => (err ? reject(err) : resolve(val)))
    );
    const daiDebt = DAI.wei(tab.toString());
    switch (unit) {
      case DAI:
        return daiDebt;
      case USD: {
        const targetPrice = await this.getTargetPrice();
        return daiDebt.times(targetPrice);
      }
    }
  }

  //updates compound interest calculations for all CDPs.  Used by tests that depend on a fee
  async _drip() {
    return this._tubContract().drip();
  }

  async getGovernanceFee(cdpId, unit = USD) {
    const hexCdpId = numberToBytes32(cdpId);
    // we need to use the Web3.js contract interface to get the return value
    // from the non-constant function `rap`
    const tub = this._smartContract().getWeb3ContractByName(contracts.SAI_TUB);
    const rap = await new Promise((resolve, reject) =>
      tub.rap.call(hexCdpId, (err, val) => (err ? reject(err) : resolve(val)))
    );
    const usdFee = USD.wei(rap);
    switch (unit) {
      case USD:
        return usdFee;
      case MKR: {
        const price = await this.get('price').getMkrPrice();
        return usdFee.div(price);
      }
    }
  }

  async getCollateralizationRatio(cdpId) {
    const usdDebt = await this.getDebtValue(cdpId, USD);
    // avoid division by 0
    if (usdDebt.eq(0)) return Infinity;

    const [pethPrice, pethCollateral] = await Promise.all([
      this.get('price').getPethPrice(),
      this.getCollateralValue(cdpId, PETH)
    ]);
    return pethCollateral
      .times(pethPrice)
      .div(usdDebt)
      .toNumber();
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

  async getTargetPrice() {
    // we need to use the Web3.js contract interface to get the return value
    // from the non-constant function `par()`
    const vox = this._smartContract().getWeb3ContractByName(contracts.SAI_VOX);
    const par = await new Promise((resolve, reject) =>
      vox.par.call((err, val) => (err ? reject(err) : resolve(val)))
    );

    return USD_DAI.ray(par);
  }

  async getLiquidationPrice(cdpId) {
    const [debt, liqRatio, collateral] = await Promise.all([
      this.getDebtValue(cdpId, USD),
      this.getLiquidationRatio(),
      this.getCollateralValue(cdpId)
    ]);
    return debt.times(liqRatio).div(collateral);
  }

  async isSafe(cdpId) {
    const [liqPrice, ethPrice] = await Promise.all([
      this.getLiquidationPrice(cdpId),
      this.get('price').getEthPrice()
    ]);
    return USD_ETH(ethPrice).gte(liqPrice);
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
    const dai = this.get('token').getToken(DAI);
    const [
      totalWethLocked,
      wethPrice,
      daiSupply,
      targetPrice
    ] = await Promise.all([
      this._tubContract().pie(),
      this.get('price').getEthPrice(),
      dai.totalSupply(),
      this.getTargetPrice()
    ]);

    const totalCollateralValue = new BigNumber(totalWethLocked)
      .div(WAD)
      .times(wethPrice.toBigNumber());
    const systemDaiDebt = daiSupply.times(targetPrice);
    return totalCollateralValue.div(systemDaiDebt.toBigNumber()).toNumber();
  }

  async getWethToPethRatio() {
    const value = await this._tubContract().per();
    return new BigNumber(value.toString()).dividedBy(RAY).toNumber();
  }

  give(cdpId, newAddress) {
    const hexCdpId = numberToBytes32(cdpId);
    return this._tubContract().give(hexCdpId, newAddress);
  }

  bite(cdpId) {
    const hexCdpId = numberToBytes32(cdpId);
    return this._tubContract().bite(hexCdpId, { gasLimit: 4000000 });
  }

  freeEthProxy(dsProxyAddress, cdpId, amount) {
    const hexCdpId = numberToBytes32(cdpId);
    const value = getCurrency(amount, ETH).toEthersBigNumber('wei');

    return this._saiProxyTubContract().free(
      this._tubContract().address,
      hexCdpId,
      value,
      {
        dsProxyAddress,
        metadata: {
          action: {
            name: 'free',
            id: cdpId,
            amount: getCurrency(amount, ETH),
            proxy: true
          }
        }
      }
    );
  }

  lockEthProxy(dsProxyAddress, cdpId, amount) {
    const hexCdpId = numberToBytes32(cdpId);
    const value = getCurrency(amount, ETH).toEthersBigNumber('wei');

    return this._saiProxyTubContract().lock(
      this._tubContract().address,
      hexCdpId,
      {
        dsProxyAddress,
        value,
        metadata: {
          action: {
            name: 'lock',
            id: cdpId,
            amount: getCurrency(amount, ETH),
            proxy: true
          }
        }
      }
    );
  }

  drawDaiProxy(dsProxyAddress, cdpId, amount) {
    const hexCdpId = numberToBytes32(cdpId);
    const value = getCurrency(amount, DAI).toEthersBigNumber('wei');

    return this._saiProxyTubContract().draw(
      this._tubContract().address,
      hexCdpId,
      value,
      {
        dsProxyAddress,
        metadata: {
          action: {
            name: 'draw',
            id: cdpId,
            amount: getCurrency(amount, DAI),
            proxy: true
          }
        }
      }
    );
  }

  giveProxy(dsProxyAddress, cdpId, newAddress) {
    const hexCdpId = numberToBytes32(cdpId);

    return this._saiProxyTubContract().give(
      this._tubContract().address,
      hexCdpId,
      newAddress,
      {
        dsProxyAddress,
        metadata: {
          action: {
            name: 'give',
            id: cdpId,
            to: newAddress,
            proxy: true
          }
        }
      }
    );
  }

  async wipeDaiProxy(dsProxyAddress, cdpId, amount, useOtc = false) {
    const hexCdpId = numberToBytes32(cdpId);
    const value = getCurrency(amount, DAI).toEthersBigNumber('wei');

    // Only require MKR allowance if paying fee using MKR (if using OTC, no need to approve MKR right now)
    let approveCalls = [
      this.get('allowance').requireAllowance(DAI, dsProxyAddress)
    ];
    if (!useOtc)
      approveCalls.unshift(
        this.get('allowance').requireAllowance(MKR, dsProxyAddress)
      );
    await Promise.all(approveCalls);

    const options = {
      dsProxyAddress,
      metadata: {
        action: {
          name: 'wipe',
          id: cdpId,
          amount: getCurrency(amount, DAI),
          otc: useOtc,
          proxy: true
        }
      }
    };

    // If using OTC to buy MKR to pay fee, pass OTC address to SaiProxy wipe() method
    return useOtc
      ? this._saiProxyTubContract()['wipe(address,bytes32,uint256,address)'](
          this._tubContract().address,
          hexCdpId,
          value,
          this._smartContract().getContractAddressByName(contracts.MAKER_OTC),
          options
        )
      : this._saiProxyTubContract()['wipe(address,bytes32,uint256)'](
          this._tubContract().address,
          hexCdpId,
          value,
          options
        );
  }

  async shutProxy(dsProxyAddress, cdpId, useOtc = false) {
    const hexCdpId = numberToBytes32(cdpId);

    // Only require MKR allowance if paying fee using MKR (if using OTC, no need to approve MKR right now)
    let approveCalls = [
      this.get('allowance').requireAllowance(DAI, dsProxyAddress)
    ];
    if (!useOtc)
      approveCalls.unshift(
        this.get('allowance').requireAllowance(MKR, dsProxyAddress)
      );
    await Promise.all(approveCalls);

    const options = {
      dsProxyAddress,
      metadata: {
        action: {
          name: 'close',
          id: cdpId,
          otc: useOtc,
          proxy: true
        }
      }
    };

    // If using OTC to buy MKR to pay fee, pass OTC address to SaiProxy shut() method
    return useOtc
      ? this._saiProxyTubContract()['shut(address,bytes32,address)'](
          this._tubContract().address,
          hexCdpId,
          this._smartContract().getContractAddressByName(contracts.MAKER_OTC),
          options
        )
      : this._saiProxyTubContract()['shut(address,bytes32)'](
          this._tubContract().address,
          hexCdpId,
          options
        );
  }
}
