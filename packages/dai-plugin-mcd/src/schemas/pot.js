import { fromRay } from '../utils';
import { DSR_DAI } from '..';

import {
  TOTAL_SAVINGS_DAI,
  SAVINGS_DAI_BY_PROXY,
  DAI_SAVINGS_RATE,
  DATE_EARNINGS_LAST_ACCRUED
} from './constants';

export const potPie = {
  generate: () => ({
    id: 'MCD_POT.Pie',
    contractName: 'MCD_POT',
    call: ['Pie()(uint256)']
  }),
  returns: [[TOTAL_SAVINGS_DAI, v => DSR_DAI(v, 'wei')]]
};

export const potpie = {
  generate: proxyAddress => ({
    id: `MCD_POT.pie(${proxyAddress})`,
    contractName: 'MCD_POT',
    call: ['pie(address)(uint256)', proxyAddress]
  }),
  returns: [[SAVINGS_DAI_BY_PROXY, v => DSR_DAI(v, 'wei')]]
};

export const potDsr = {
  generate: () => ({
    id: 'MCD_POT.dsr',
    contractName: 'MCD_POT',
    call: ['dsr()(uint256)']
  }),
  returns: [[DAI_SAVINGS_RATE, fromRay]]
};

export const potRho = {
  generate: () => ({
    id: 'MCD_POT.rho',
    contractName: 'MCD_POT',
    call: ['rho()(uint256)']
  }),
  returns: [
    [DATE_EARNINGS_LAST_ACCRUED, val => new Date(val.toNumber() * 1000)]
  ]
};

export const annualDaiSavingsRate = {
  generate: () => ({
    dependencies: () => [[DAI_SAVINGS_RATE]],
    computed: daiSavingsRate =>
      daiSavingsRate
        .pow(365 * 24 * 60 * 60)
        .minus(1)
        .times(100)
  })
};

export default {
  potPie,
  potpie,
  potDsr,
  potRho,

  // computed
  annualDaiSavingsRate
};
