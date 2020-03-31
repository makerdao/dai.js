import {
  CURRENT_PRICE_FEED_VALUE,
  CURRENT_PRICE_FEED_VALID,
  NEXT_PRICE_FEED_VALUE,
  NEXT_PRICE_FEED_VALID
} from './_constants';

export const osmPeek = {
  generate: symbol => ({
    id: `PIP.peek(${symbol})`,
    contract: `PIP_${symbol}`,
    call: ['peek()(bytes32,bool)']
  }),
  returns: [[CURRENT_PRICE_FEED_VALUE], [CURRENT_PRICE_FEED_VALID]]
};

export default {
  osmPeek
};
