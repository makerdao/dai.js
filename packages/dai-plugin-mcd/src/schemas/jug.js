import { annualStabilityFee } from '../math';
import { toHex } from '../utils';

import {
  ANNUAL_STABILITY_FEE,
  DATE_STABILITY_FEES_LAST_LEVIED
} from './constants';

export const jugIlks = {
  generate: collateralTypeName => ({
    id: `MCD_JUG.ilks(${collateralTypeName})`,
    contractName: 'MCD_JUG',
    call: ['ilks(bytes32)(uint256,uint48)', toHex(collateralTypeName)]
  }),
  returns: [
    [ANNUAL_STABILITY_FEE, annualStabilityFee],
    [DATE_STABILITY_FEES_LAST_LEVIED, val => new Date(val * 1000)]
  ]
};

export default {
  jugIlks
};
