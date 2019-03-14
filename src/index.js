import Maker from './Maker';
import { currencies } from './eth/Currency';
import { stringToBytes32 } from './utils/conversion';
import QueryApi from './QueryApi';

for (let symbol in currencies) {
  Maker[symbol] = currencies[symbol];
}

Maker.currencies = currencies;
Maker.QueryApi = QueryApi;
Maker.utils = { stringToBytes32 };

module.exports = Maker;
