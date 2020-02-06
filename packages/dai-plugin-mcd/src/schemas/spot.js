import { toHex, fromRay } from '../utils';
import { createCurrencyRatio } from '@makerdao/currency';
import { MDAI, USD } from '../..';

import {
  PRICE_FEED_ADDRESS,
  LIQUIDATION_RATIO,
  RATIO_DAI_USD
} from './constants';

export const spotIlks = {
  generate: collateralTypeName => ({
    id: `MCD_SPOT.ilks(${collateralTypeName})`,
    contractName: 'MCD_SPOT',
    call: ['ilks(bytes32)(address,uint256)', toHex(collateralTypeName)],
    transforms: {
      [LIQUIDATION_RATIO]: liqRatio =>
        createCurrencyRatio(USD, MDAI)(fromRay(liqRatio))
    }
  }),
  validateParams: collateralTypeName => {
    if (collateralTypeName === null)
      throw new Error('Invalid collateral type name');
  },
  returns: [[PRICE_FEED_ADDRESS], [LIQUIDATION_RATIO]]
};

export const spotPar = {
  generate: () => ({
    id: 'MCD_SPOT.par()',
    contractName: 'MCD_SPOT',
    call: ['par()(uint256)']
  }),
  returns: [[RATIO_DAI_USD, v => createCurrencyRatio(MDAI, USD)(fromRay(v))]]
};

export default {
  spotIlks,
  spotPar
};
