import { toHex, fromRay } from '../utils';
import { createCurrencyRatio } from '@makerdao/currency';
import { MDAI, USD } from '../..';

import {
  PRICE_FEED_ADDRESS,
  LIQUIDATION_RATIO,
  RATIO_DAI_USD
} from './_constants';

const validateCollateralTypeName = name =>
  !name && 'Invalid collateral type name';

const validatePriceFeedAddressResult = (result, [name]) =>
  result === '0x0000000000000000000000000000000000000000' &&
  `No collateral type with name ${name} found`;

const validateLiquidationRatioResult = (result, [name]) => {
  return !result && `No collateral type with name ${name} found`;
};

export const spotIlks = {
  generate: collateralTypeName => ({
    id: `MCD_SPOT.ilks(${collateralTypeName})`,
    contract: 'MCD_SPOT',
    call: ['ilks(bytes32)(address,uint256)', toHex(collateralTypeName)],
    transforms: {
      [LIQUIDATION_RATIO]: liqRatio =>
        liqRatio.toString() !== '0'
          ? createCurrencyRatio(USD, MDAI)(fromRay(liqRatio))
          : null
    }
  }),
  validate: {
    args: validateCollateralTypeName,
    [PRICE_FEED_ADDRESS]: validatePriceFeedAddressResult,
    [LIQUIDATION_RATIO]: validateLiquidationRatioResult
  },
  returns: [[PRICE_FEED_ADDRESS], [LIQUIDATION_RATIO]]
};

export const spotPar = {
  generate: () => ({
    id: 'MCD_SPOT.par()',
    contract: 'MCD_SPOT',
    call: ['par()(uint256)']
  }),
  returns: [[RATIO_DAI_USD, v => createCurrencyRatio(MDAI, USD)(fromRay(v))]]
};

export default {
  spotIlks,
  spotPar
};
