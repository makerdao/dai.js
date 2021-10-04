import Maker from './Maker';
import { currencies } from './eth/Currency';
import { stringToBytes32 } from './utils/conversion';
import { getQueryResponse } from './QueryApi';
export * from './eth/Currency';

for (let symbol in currencies) {
  Maker[symbol] = currencies[symbol];
}


Maker.currencies = currencies;
Maker.QueryApi = { getQueryResponse };
Maker.utils = { stringToBytes32 };

export default Maker;

export const QueryApi = { getQueryResponse };
export const utils = { stringToBytes32 };

