import BigNumber from 'bignumber.js';
import { toHex } from '../utils';
import { RAY } from '../constants';

import {
  ANNUAL_STABILITY_FEE,
  DATE_STABILITY_FEES_LAST_LEVIED,
  BASE_COLLATERAL_FEE
} from './_constants';

const secondsPerYear = 60 * 60 * 24 * 365;

export const jugIlks = {
  generate: collateralTypeName => ({
    id: `MCD_JUG.ilks(${collateralTypeName})`,
    contract: 'MCD_JUG',
    call: ['ilks(bytes32)(uint256,uint48)', toHex(collateralTypeName)]
  }),
  returns: [
    [
      ANNUAL_STABILITY_FEE,
      v => {
        v = new BigNumber(v.toString()).dividedBy(RAY);
        BigNumber.config({ POW_PRECISION: 100 });
        return v.pow(secondsPerYear).minus(1);
      }
    ],
    [DATE_STABILITY_FEES_LAST_LEVIED, val => new Date(val * 1000)]
  ]
};

export const jugBase = {
  generate: () => ({
    id: 'MCD_JUG.base',
    contract: 'MCD_JUG',
    call: ['base()(uint256)']
  }),
  returns: [[BASE_COLLATERAL_FEE, v => BigNumber(v)]]
};

export default {
  jugIlks,
  jugBase
};
