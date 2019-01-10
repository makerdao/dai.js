import Maker from './Maker';
import {
  Currency,
  currencies,
  createCurrency,
  getCurrency
} from './eth/Currency';
import LocalService from './core/LocalService';
import PrivateService from './core/PrivateService';
import PublicService from './core/PublicService';
import { stringToBytes32 } from './utils/conversion';

for (let symbol in currencies) {
  Maker[symbol] = currencies[symbol];
}

Maker.LocalService = LocalService;
Maker.PrivateService = PrivateService;
Maker.PublicService = PublicService;

Maker.Currency = Currency;
Maker.createCurrency = createCurrency;
Maker.getCurrency = getCurrency;
Maker.currencies = currencies;

Maker.utils = {
  stringToBytes32
};

module.exports = Maker;
