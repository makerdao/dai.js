import { fromRay, fromWei } from '../utils';

import {
  TOTAL_SAVINGS_DAI,
  SAVINGS_DAI,
  DAI_SAVINGS_RATE,
  DATE_EARNINGS_LAST_ACCRUED,
  SAVINGS_RATE_ACCUMULATOR
} from './_constants';
import { validateAddress } from './_validators';

export const potPie = {
  generate: () => ({
    id: 'MCD_POT.Pie',
    contract: 'MCD_POT',
    call: ['Pie()(uint256)']
  }),
  returns: [[TOTAL_SAVINGS_DAI, fromWei]]
};

export const potpie = {
  generate: address => ({
    id: `MCD_POT.pie(${address})`,
    contract: 'MCD_POT',
    call: ['pie(address)(uint256)', address]
  }),
  validate: {
    args: validateAddress`Invalid address: ${'address'}`
  },
  returns: [[SAVINGS_DAI, fromWei]]
};

export const potDsr = {
  generate: () => ({
    id: 'MCD_POT.dsr',
    contract: 'MCD_POT',
    call: ['dsr()(uint256)']
  }),
  returns: [[DAI_SAVINGS_RATE, fromRay]]
};
export const potChi = {
  generate: () => ({
    id: 'MCD_POT.chi',
    contract: 'MCD_POT',
    call: ['chi()(uint256)']
  }),
  returns: [[SAVINGS_RATE_ACCUMULATOR, fromRay]]
};

export const potRho = {
  generate: () => ({
    id: 'MCD_POT.rho',
    contract: 'MCD_POT',
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
  potChi,

  // computed
  annualDaiSavingsRate
};
