import Maker from '@makerdao/dai';
import { WAD, RAY } from '@makerdao/dai/utils/constants';
import BigNumber from 'bignumber.js';
import { getIlkForCurrency, getSpotContractNameForCurrency, getPipContractNameForCurrency, getFlipContractNameForCurrency } from './utils';
import CdpType from './CdpType';

export default class CollateralService extends Maker.PublicService {

// Collateral-Specic Data ----------------------------------------------

  constructor(name = 'collateral') {
    super(name, ['smartContract']);
  }

  initialize(settings = {}) {
    if (settings.cdpTypes) {
      this._cdpTypes = settings.cdpTypes.map( ilk => getCdpTypeObject(ilk.currency));
    }
  }

  //todo: allow specifying unit for return value (requires a price service that gives price given an ilkBytes)
  async getTotalCollateral(currency) {
    const ilkBytes = getIlkForCurrency(currency);
    const ilkInfo = await this._vatContract().ilks(ilkBytes);
    const Ink = ilkInfo.Ink;
    return new BigNumber(Ink.toString()).dividedBy(WAD).toNumber();
  }

  async getTotalDebt(currency) {
    const ilkBytes = getIlkForCurrency(currency);
    const ilkInfo = await this._vatContract().ilks(ilkBytes);
    const Art = ilkInfo.Art;
    return new BigNumber(Art.toString()).dividedBy(WAD).toNumber();
  }

  async getDebtCeiling(currency) {
    const ilkBytes = getIlkForCurrency(currency);
    const ilkInfo = await this._pitContract().ilks(ilkBytes);
    const line = ilkInfo.line;
    return new BigNumber(line.toString()).dividedBy(WAD).toNumber();
  }

  async getLiquidationRatio(currency) {
    const spotContract = this._spotContract(currency);
    const mat = await spotContract.mat();
    return new BigNumber(mat.toString()).dividedBy(RAY).toNumber();
  }

  async getPrice(currency) {
    const pipContract = this._pipContract(currency);
    const val = (await pipContract.peek())[0];
    return new BigNumber(val.toString()).dividedBy(RAY).toNumber();
  }

  async getLiquidationPenalty(currency) {
    const ilkBytes = getIlkForCurrency(currency);
    const ilkInfo = await this._catContract().ilks(ilkBytes);
    const chop = ilkInfo.chop;
    return new BigNumber(chop.toString()).dividedBy(RAY).minus(1).toNumber();
  }

  async getAnnualStabilityFee(currency) {
    const ilkBytes = getIlkForCurrency(currency);
    const ilkInfo = await this._dripContract().ilks(ilkBytes);
    const tax = ilkInfo.tax;
    const taxBigNumber = new BigNumber(tax.toString()).dividedBy(RAY);
    const secondsPerYear = 60 * 60 * 24 * 365;
    BigNumber.config({ POW_PRECISION: 100 });
    return taxBigNumber
      .pow(secondsPerYear)
      .minus(1)
      .toNumber();
  }

  //returns time in hours
  async getMaxBidLifetime(currency) {
    const flipContract = this._flipContract(currency);
    const ttl = await flipContract.ttl();
    const secondsInHour = 60 * 60;
    return new BigNumber(ttl.toString()).dividedBy(secondsInHour).toNumber();
  }

    //returns time in days
  async getMaxAuctionDuration(currency) {
    const flipContract = this._flipContract(currency);
    const tau = await flipContract.tau();
    const secondsInDay = 60 * 60 * 24;
    return new BigNumber(tau.toString()).dividedBy(secondsInDay).toNumber();
  }

  //returns decimal representation of minimum percentage increase
  async getMinBidIncrease(currency) {
    const flipContract = this._flipContract(currency);
    const beg = await flipContract.beg();
    return new BigNumber(beg.toString()).dividedBy(RAY).minus(1).toNumber();
  }

// System-Wide Data ----------------------------------------------

  async getAnnualSavingsRate() {
    const repo = await this._dripContract().repo();
    const repoBigNumber = new BigNumber(repo.toString()).dividedBy(RAY);
    const secondsPerYear = 60 * 60 * 24 * 365;
    BigNumber.config({ POW_PRECISION: 100 });
    return repoBigNumber
      .pow(secondsPerYear)
      .toNumber();
  }

  async getSystemWideDebtCeiling(currency) {
    const Line = await this._pitContract().Line();
    return new BigNumber(Line.toString()).dividedBy(WAD).toNumber();
  }

  //add mkr and and dai prices here

// Getting CDPType ojbects -------------------------------------

  //should these be 'get' functions?

  getCdpTypeObject(currency){
    return new CdpType(this, currency);
  }

  listAllCdpTypes(){
    return this._cdpTypes;
  }


// Helpers ----------------------------------------------

  _dripContract(currency) {
    return this.get('smartContract').getContractByName('MCD_DRIP');
  }

  _pipContract(currency) {
    return this.get('smartContract').getContractByName(getPipContractNameForCurrency(currency));
  }

  _flipContract(currency) {
    return this.get('smartContract').getContractByName(getFlipContractNameForCurrency(currency));
  }

  _spotContract(currency) {
    return this.get('smartContract').getContractByName(getSpotContractNameForCurrency(currency));
  }

  _catContract() {
    return this.get('smartContract').getContractByName('MCD_CAT');
  }

  _pitContract() {
    return this.get('smartContract').getContractByName('MCD_PIT');
  }

  _vatContract() {
    return this.get('smartContract').getContractByName('MCD_VAT');
  }

}