import BigNumber from 'bignumber.js';

import {
  TOKEN_PRICE_NEXT_UPDATE,
  TOKEN_PRICE_UPDATE_INTERVAL,
  TOKEN_PRICE_LAST_UPDATE
} from './_constants';

export const tokenPriceLastUpdate = {
  generate: token => ({
    id: `PIP_${token}.zzz`,
    contract: `PIP_${token}`,
    call: ['zzz()(uint64)']
  }),
  returns: [[TOKEN_PRICE_LAST_UPDATE, v => BigNumber(v).times(1000)]]
};

export const tokenPriceUpdateInterval = {
  generate: token => ({
    id: `PIP_${token}.hop`,
    contract: `PIP_${token}`,
    call: ['hop()(uint16)']
  }),
  returns: [[TOKEN_PRICE_UPDATE_INTERVAL, v => BigNumber(v).times(1000)]]
};

export const tokenPriceNextUpdate = {
  generate: token => ({
    dependencies: [
      [TOKEN_PRICE_LAST_UPDATE, token],
      [TOKEN_PRICE_UPDATE_INTERVAL, token]
    ],
    computed: (lastUpdate, interval) =>
      new Date(lastUpdate.plus(interval).toNumber())
  })
};

export const tokenPricesNextUpdates = {
  generate: tokenList => ({
    dependencies: tokenList.map(token => [TOKEN_PRICE_NEXT_UPDATE, token]),
    computed: (...list) =>
      list.reduce(
        (acc, time, idx) => ({
          [`${tokenList[idx]}`]: time,
          ...acc
        }),
        {}
      )
  })
};

export default {
  tokenPriceLastUpdate,
  tokenPriceUpdateInterval,
  tokenPriceNextUpdate,
  tokenPricesNextUpdates
};
