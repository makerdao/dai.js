import { toHex, fromRay } from '../utils';
import BigNumber from 'bignumber.js';
import { RAY } from '../constants';

import {
  LIQUIDATOR_ADDRESS,
  LIQUIDATION_PENALTY,
  MAX_AUCTION_LOT_SIZE
} from './_constants';

const validateCollateralTypeName = name =>
  !name && 'Invalid collateral type name';

export const catIlks = {
  generate: collateralTypeName => ({
    id: `MCD_CAT.ilks(${collateralTypeName})`,
    contract: 'MCD_CAT',
    call: ['ilks(bytes32)(address,uint256,uint256)', toHex(collateralTypeName)]
  }),
  validate: {
    args: validateCollateralTypeName
  },
  returns: [
    [LIQUIDATOR_ADDRESS],
    [LIQUIDATION_PENALTY, v => fromRay(BigNumber(v).minus(RAY))],
    [MAX_AUCTION_LOT_SIZE, v => BigNumber(v).shiftedBy(-18)]
  ]
};

export default {
  catIlks
};
