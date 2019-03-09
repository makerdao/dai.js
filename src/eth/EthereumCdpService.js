import { PrivateService } from '@makerdao/services-core';
import contracts from '../../contracts/contracts';
import Cdp from './Cdp';
import ProxyCdp from './ProxyCdp';
import QueryApi from '../QueryApi';
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
import tracksTransactions from '../utils/tracksTransactions';

export default class EthereumCdpService extends PrivateService {
  /**
   * @param {string} name
   */
  constructor(name = 'cdp') {
    super(name, [
      'allowance',
      'conversion',
      'event',
      'price',
      'smartContract',
      'token'
    ]);

    // aliases
    this.freeEth = this.freePeth;
  }

  _smartContract() {
    return this.get('smartContract');
  }

  _txMgr() {
    return this.get('smartContract').get('transactionManager');
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

  async _findCdp(id, dsProxy = null) {
    if (typeof id !== 'number') {
      throw new Error('ID must be a number.');
    }
    const info = await this.getInfo(id);
    if (info.lad.toString() === '0x0000000000000000000000000000000000000000') {
      throw new Error("That CDP doesn't exist--try opening a new one.");
    }
    return dsProxy === null
      ? new Cdp(this, id)
      : new ProxyCdp(this, dsProxy, id);
  }

  async _throwIfNotEnoughMkrToWipe(cdpId, amountToWipe, unit = DAI) {
    const enoughMkrToWipe = await this.enoughMkrToWipe(
      cdpId,
      amountToWipe,
      unit
    );
    if (enoughMkrToWipe === false)
      throw new Error('not enough MKR balance to cover governance fee');
  }

  async enoughMkrToWipe(cdpId, amountToWipe, unit = DAI) {
    const dai = getCurrency(amountToWipe, unit);
    if (dai.eq(0)) return;
    const MkrToken = this.get('token').getToken(MKR);
    const ownerAddress = this.get('token')
      .get('web3')
      .currentAddress();
    const [fee, balance, debt] = await Promise.all([
      this.getGovernanceFee(cdpId, MKR),
      MkrToken.balanceOf(ownerAddress),
      this.getDebtValue(cdpId)
    ]);
    const mkrOwed = dai
      .div(debt)
      .toBigNumber()
      .times(fee.toBigNumber());
    if (mkrOwed.gt(balance.toBigNumber())) {
      return false;
    }
    return true;
  }

  openCdp() {
    return new Cdp(this).transactionObject();
  }

  openProxyCdp(dsProxy = null) {
    return new ProxyCdp(this, dsProxy).transactionObject();
  }

  openProxyCdpLockEthAndDrawDai(amountEth, amountDai, dsProxy = null) {
    return new ProxyCdp(this, dsProxy, null, {
      lockAndDraw: true,
      amountEth,
      amountDai
    }).transactionObject();
  }

  async getCdpIds(address) {
    if (!address) {
      address = this._web3Service()
      .get('accounts')
      .currentAddress();
    }

    const api = new QueryApi(this._web3Service().networkId());
    return api.getCdpIdsForOwner(address);
  }

  getCdp(id, dsProxy = null) {
    return this._findCdp(id, dsProxy);
  }

  async shut(cdpId) {
    const debt = await this.getDebtValue(cdpId, DAI);
    await this._throwIfNotEnoughMkrToWipe(cdpId, debt);
    const hexCdpId = numberToBytes32(cdpId);
    await this.get('allowance').requireAllowance(MKR, this._tubContract().address),
    await this.get('allowance').requireAllowance(DAI, this._tubContract().address)
    return this._tubContract().shut(hexCdpId);
  }

  @tracksTransactions
  async lockEth(cdpId, amount, { unit = ETH, promise }) {
    const convert = this._conversionService().convertEthToWeth(amount, {
      unit,
      promise
    });
    await this._txMgr().confirm(convert);
    return this.lockWeth(cdpId, amount, { promise });
  }

  @tracksTransactions
  async lockWeth(cdpId, amount, { unit = WETH, promise }) {
    const wethPerPeth = await this.get('price').getWethToPethRatio();
    const weth = getCurrency(amount, unit);
    await this._conversionService().convertWethToPeth(weth, {
      promise
    });

    return this.lockPeth(cdpId, weth.div(wethPerPeth), { promise });
  }

  @tracksTransactions
  async lockPeth(cdpId, amount, { unit = PETH, promise }) {
    const hexCdpId = numberToBytes32(cdpId);
    const value = getCurrency(amount, unit).toEthersBigNumber('wei');
    await this.get('allowance').requireAllowance(
      PETH,
      this._tubContract().address,
      { promise }
    );
    return this._tubContract().lock(hexCdpId, value, {
      promise
    });
  }

  freePeth(cdpId, amount, { unit = PETH, promise } = {}) {
    const hexCdpId = numberToBytes32(cdpId);
    const value = getCurrency(amount, unit).toEthersBigNumber('wei');
    return this._tubContract().free(hexCdpId, value, { promise });
  }

  drawDai(cdpId, amount, { unit = DAI, promise } = {}) {
    const hexCdpId = numberToBytes32(cdpId);
    const value = getCurrency(amount, unit).toEthersBigNumber('wei');
    return this._tubContract().draw(hexCdpId, value, { promise });
  }

  @tracksTransactions
  async wipeDai(cdpId, amount, { unit = DAI, promise }) {
    const value = getCurrency(amount, unit).toEthersBigNumber('wei');
    await this._throwIfNotEnoughMkrToWipe(cdpId, amount, unit);
    const hexCdpId = numberToBytes32(cdpId);
    await this.get('allowance').requireAllowance(MKR, this._tubContract().address),
    await this.get('allowance').requireAllowance(DAI, this._tubContract().address)
    return this._tubContract().wipe(hexCdpId, value, { promise });
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
      tub.methods
        .tab(hexCdpId)
        .call({}, (err, val) => (err ? reject(err) : resolve(val)))
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

  async getGovernanceFee(cdpId, unit = MKR) {
    const hexCdpId = numberToBytes32(cdpId);
    // we need to use the Web3.js contract interface to get the return value
    // from the non-constant function `rap`
    const tub = this._smartContract().getWeb3ContractByName(contracts.SAI_TUB);
    const rap = await new Promise((resolve, reject) => {
      tub.methods
        .rap(hexCdpId)
        .call({}, (err, val) => (err ? reject(err) : resolve(val)));
    });
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
      vox.methods
        .par()
        .call({}, (err, val) => (err ? reject(err) : resolve(val)))
    );

    return USD_DAI.ray(par);
  }

  async getLiquidationPrice(cdpId) {
    const [debt, liqRatio, collateral] = await Promise.all([
      this.getDebtValue(cdpId, USD),
      this.getLiquidationRatio(),
      this.getCollateralValue(cdpId)
    ]);
    if (collateral.eq(0)) return USD_ETH(Infinity);
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

  give(cdpId, newAddress, options = {}) {
    const hexCdpId = numberToBytes32(cdpId);
    return this._tubContract().give(hexCdpId, newAddress, options);
  }

  bite(cdpId, options = {}) {
    const hexCdpId = numberToBytes32(cdpId);
    return this._tubContract().bite(hexCdpId, options);
  }

  freeEthProxy(dsProxy, cdpId, amount) {
    const hexCdpId = numberToBytes32(cdpId);
    const value = getCurrency(amount, ETH).toEthersBigNumber('wei');

    return this._saiProxyTubContract().free(
      this._tubContract().address,
      hexCdpId,
      value,
      {
        dsProxy,
        metadata: {
          action: {
            name: 'free',
            id: cdpId,
            amount: getCurrency(amount, ETH),
            proxy: dsProxy
          }
        }
      }
    );
  }

  lockEthProxy(dsProxy, cdpId, amount) {
    const hexCdpId = numberToBytes32(cdpId);
    const value = getCurrency(amount, ETH).toEthersBigNumber('wei');

    return this._saiProxyTubContract().lock(
      this._tubContract().address,
      hexCdpId,
      {
        dsProxy,
        value,
        metadata: {
          action: {
            name: 'lock',
            id: cdpId,
            amount: getCurrency(amount, ETH),
            proxy: dsProxy
          }
        }
      }
    );
  }

  lockEthAndDrawDaiProxy(dsProxy, cdpId, amountEth, amountDai) {
    const hexCdpId = numberToBytes32(cdpId);
    const valueEth = getCurrency(amountEth, ETH).toEthersBigNumber('wei');
    const valueDai = getCurrency(amountDai, DAI).toEthersBigNumber('wei');

    return this._saiProxyTubContract().lockAndDraw(
      this._tubContract().address,
      hexCdpId,
      valueDai,
      {
        dsProxy,
        value: valueEth,
        metadata: {
          action: {
            name: 'lockAndDraw',
            id: cdpId,
            lockAmount: getCurrency(amountEth, ETH),
            drawAmount: getCurrency(amountDai, DAI),
            proxy: dsProxy
          }
        }
      }
    );
  }

  drawDaiProxy(dsProxy, cdpId, amount) {
    const hexCdpId = numberToBytes32(cdpId);
    const value = getCurrency(amount, DAI).toEthersBigNumber('wei');

    return this._saiProxyTubContract().draw(
      this._tubContract().address,
      hexCdpId,
      value,
      {
        dsProxy,
        metadata: {
          action: {
            name: 'draw',
            id: cdpId,
            amount: getCurrency(amount, DAI),
            proxy: dsProxy
          }
        }
      }
    );
  }

  giveProxy(dsProxy, cdpId, newAddress) {
    const hexCdpId = numberToBytes32(cdpId);

    return this._saiProxyTubContract().give(
      this._tubContract().address,
      hexCdpId,
      newAddress,
      {
        dsProxy,
        metadata: {
          action: {
            name: 'give',
            id: cdpId,
            to: newAddress,
            proxy: dsProxy
          }
        }
      }
    );
  }

  @tracksTransactions
  async wipeDaiProxy(dsProxy, cdpId, amount, { useOtc, promise }) {
    const hexCdpId = numberToBytes32(cdpId);
    const value = getCurrency(amount, DAI).toEthersBigNumber('wei');

    await this.get('allowance').requireAllowance(DAI, dsProxy, {
      promise
    });
    // Only require MKR allowance if paying fee using MKR (if using OTC, no need
    // to approve MKR right now)
    if (!useOtc) {
      await this._throwIfNotEnoughMkrToWipe(cdpId, amount, DAI);
      await this.get('allowance').requireAllowance(MKR, dsProxy, {
        promise
      });
    }

    const options = {
      dsProxy,
      metadata: {
        action: {
          name: 'wipe',
          id: cdpId,
          amount: getCurrency(amount, DAI),
          otc: useOtc,
          proxy: dsProxy
        }
      },
      promise
    };

    // If using OTC to buy MKR to pay fee, pass OTC address to SaiProxy wipe()
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

  @tracksTransactions
  async shutProxy(dsProxy, cdpId, { useOtc, promise }) {
    const hexCdpId = numberToBytes32(cdpId);

    await this.get('allowance').requireAllowance(DAI, dsProxy, {
      promise
    });
    // Only require MKR allowance and balance if paying fee using MKR (if using
    // OTC, no need to approve MKR right now)
    if (!useOtc) {
      const debt = await this.getDebtValue(cdpId, DAI);
      await this._throwIfNotEnoughMkrToWipe(cdpId, debt);
      await this.get('allowance').requireAllowance(MKR, dsProxy, {
        promise
      });
    }

    const options = {
      dsProxy,
      metadata: {
        action: {
          name: 'close',
          id: cdpId,
          otc: useOtc,
          proxy: dsProxy
        }
      },
      promise
    };

    // If using OTC to buy MKR to pay fee, pass OTC address to SaiProxy shut()
    // method
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
