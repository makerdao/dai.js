import { toHex, fromRay } from '../utils';
import { createCurrency, createCurrencyRatio } from '@makerdao/currency';
import { MDAI, USD } from '../..';

import {
  PRICE_FEED_ADDRESS,
  RAW_LIQUIDATION_RATIO,
  RATIO_DAI_USD
} from './constants';

export const spotIlks = {
  generate: ilkName => ({
    id: `MCD_SPOT.ilks(${ilkName})`,
    contractName: 'MCD_SPOT',
    call: ['ilks(bytes32)(address,uint256)', toHex(ilkName)]
  }),
  returns: [PRICE_FEED_ADDRESS, [RAW_LIQUIDATION_RATIO, fromRay]]
};

export const spotPar = {
  generate: () => ({
    id: 'MCD_SPOT.par()',
    contractName: 'MCD_SPOT',
    call: ['par()(uint256)']
  }),
  returns: [[RATIO_DAI_USD, v => createCurrencyRatio(MDAI, USD)(fromRay(v))]]
};

export const liquidationRatio = {
  // The liquidation ratio value is the ratio between the minimum dollar amount of a unit of
  // collateral in terms of a single dollar unit amount of debt in which the system does not
  // deem a vault of that collateral type (ilk) underwater
  //
  // In plain english, it is the ratio of the dollar amount of ETH in terms of
  // the dollar amount of dai
  generate: ilkName => ({
    dependencies: () => [[RAW_LIQUIDATION_RATIO, ilkName]],
    computed: liqRatio =>
      createCurrencyRatio(
        createCurrency(`(${ilkName.split('-')[0]}/USD)`),
        createCurrency(`(${MDAI.symbol}/USD)`)
      )(liqRatio)
  })
};

export default {
  spotIlks,
  spotPar,

  // computed
  liquidationRatio
};
