import { toHex, fromRay } from '../utils';
import BigNumber from 'bignumber.js';
import { RAY } from '../constants';

import {
  LIQUIDATOR_ADDRESS,
  LIQUIDATION_PENALTY,
  MAX_AUCTION_LOT_SIZE
} from './constants';

export const catIlks = {
  generate: collateralTypeName => ({
    id: `MCD_CAT.ilks(${collateralTypeName})`,
    contractName: 'MCD_CAT',
    call: ['ilks(bytes32)(address,uint256,uint256)', toHex(collateralTypeName)]
  }),
  validateParams: collateralTypeName => {
    if (collateralTypeName === null)
      throw new Error('Invalid collateral type name');
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
