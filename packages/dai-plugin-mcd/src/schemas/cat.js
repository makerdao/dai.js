import { toHex } from '../utils';
import BigNumber from 'bignumber.js';
import { liquidationPenalty } from '../math';

import {
  LIQUIDATOR_ADDRESS,
  LIQUIDATION_PENALTY,
  MAX_AUCTION_LOT_SIZE
} from './constants';

export const catIlks = {
  generate: ilkName => ({
    id: `MCD_CAT.ilks(${ilkName})`,
    contractName: 'MCD_CAT',
    call: ['ilks(bytes32)(address,uint256,uint256)', toHex(ilkName)]
  }),
  returns: [
    [LIQUIDATOR_ADDRESS],
    [LIQUIDATION_PENALTY, liquidationPenalty],
    [MAX_AUCTION_LOT_SIZE, v => BigNumber(v).shiftedBy(-18)]
  ]
};

export default {
  catIlks
};
